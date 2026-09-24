// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRevenueRouter {
    function withdraw() external;
}

/// @notice Fixed-term principal/yield claims backed only by creator revenue
/// credited by CircuitCommonsRouter. This is a deliberately small hackathon
/// primitive; production deployment still requires an audit and a real PT/YT
/// token adapter if external DeFi protocols need ERC-20 compatibility.
contract CircuitRevenueVault {
    uint256 private constant SCALE = 1e18;

    IRevenueRouter public immutable router;
    uint256 public immutable circuitId;
    bytes32 public immutable manifestHash;
    uint256 public immutable maturity;
    uint256 public immutable depositCap;

    uint256 public totalPrincipal;
    uint256 public totalYT;
    uint256 public revenueIndex;
    uint256 public revenueReceived;
    uint256 private locked = 1;

    mapping(address => uint256) public ptBalanceOf;
    mapping(address => uint256) public ytBalanceOf;
    mapping(address => uint256) public userRevenueIndex;
    mapping(address => uint256) public pendingYield;

    event Deposited(address indexed account, uint256 principal, uint256 ptMinted, uint256 ytMinted);
    event RevenueSynced(uint256 amount, uint256 revenueIndex);
    event YieldClaimed(address indexed account, uint256 amount);
    event PTRedeemed(address indexed account, uint256 amount);
    event PTTransfer(address indexed from, address indexed to, uint256 amount);
    event YTTransfer(address indexed from, address indexed to, uint256 amount);

    constructor(address router_, uint256 circuitId_, bytes32 manifestHash_, uint256 maturity_, uint256 depositCap_) {
        require(router_ != address(0), "ZERO_ROUTER");
        require(manifestHash_ != bytes32(0), "EMPTY_MANIFEST");
        require(maturity_ > block.timestamp, "BAD_MATURITY");
        require(depositCap_ > 0, "ZERO_CAP");
        router = IRevenueRouter(router_);
        circuitId = circuitId_;
        manifestHash = manifestHash_;
        maturity = maturity_;
        depositCap = depositCap_;
    }

    function deposit() external payable nonReentrant {
        require(block.timestamp < maturity, "MATURED");
        require(msg.value > 0 && totalPrincipal + msg.value <= depositCap, "CAP_EXCEEDED");
        _accrue(msg.sender);
        totalPrincipal += msg.value;
        totalYT += msg.value;
        ptBalanceOf[msg.sender] += msg.value;
        ytBalanceOf[msg.sender] += msg.value;
        userRevenueIndex[msg.sender] = revenueIndex;
        emit Deposited(msg.sender, msg.value, msg.value, msg.value);
    }

    /// @dev Pulls the creator share from Router. Router only credits this
    /// contract when Registry points a manifest's revenueRecipient here.
    function syncRevenue() external nonReentrant {
        router.withdraw();
    }

    function claimYield() external nonReentrant {
        _accrue(msg.sender);
        uint256 amount = pendingYield[msg.sender];
        require(amount > 0, "NO_YIELD");
        pendingYield[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "YIELD_TRANSFER_FAILED");
        emit YieldClaimed(msg.sender, amount);
    }

    function redeemPT() external nonReentrant {
        require(block.timestamp >= maturity, "NOT_MATURED");
        _accrue(msg.sender);
        uint256 amount = ptBalanceOf[msg.sender];
        require(amount > 0, "NO_PT");
        ptBalanceOf[msg.sender] = 0;
        totalPrincipal -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "PT_TRANSFER_FAILED");
        emit PTRedeemed(msg.sender, amount);
    }

    function transferPT(address to, uint256 amount) external nonReentrant {
        require(to != address(0) && ptBalanceOf[msg.sender] >= amount, "BAD_PT_TRANSFER");
        ptBalanceOf[msg.sender] -= amount;
        ptBalanceOf[to] += amount;
        emit PTTransfer(msg.sender, to, amount);
    }

    function transferYT(address to, uint256 amount) external nonReentrant {
        require(to != address(0) && ytBalanceOf[msg.sender] >= amount, "BAD_YT_TRANSFER");
        _accrue(msg.sender);
        _accrue(to);
        ytBalanceOf[msg.sender] -= amount;
        ytBalanceOf[to] += amount;
        emit YTTransfer(msg.sender, to, amount);
    }

    receive() external payable {
        require(msg.sender == address(router), "ONLY_ROUTER");
        require(totalYT > 0, "NO_YT_HOLDERS");
        revenueReceived += msg.value;
        revenueIndex += (msg.value * SCALE) / totalYT;
        emit RevenueSynced(msg.value, revenueIndex);
    }

    function _accrue(address account) private {
        uint256 last = userRevenueIndex[account];
        if (revenueIndex > last && ytBalanceOf[account] > 0) {
            pendingYield[account] += (ytBalanceOf[account] * (revenueIndex - last)) / SCALE;
        }
        userRevenueIndex[account] = revenueIndex;
    }

    modifier nonReentrant() {
        require(locked == 1, "REENTRANT");
        locked = 2;
        _;
        locked = 1;
    }
}
