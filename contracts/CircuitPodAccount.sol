// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICircuitPodOwnership {
    function ownerOf(uint256 circuitId) external view returns (address);
}

/// @notice A stable X Layer account whose controller is always the current
/// owner of a TapeOut Circuit. Assets and application permissions stay at
/// this address when the Circuit NFT changes hands.
contract CircuitPodAccount {
    ICircuitPodOwnership public immutable ownership;
    uint256 public immutable circuitId;

    event Executed(address indexed target, uint256 value, bytes data, bytes result);
    event ERC20Recovered(address indexed token, address indexed recipient, uint256 amount);

    constructor(address ownership_, uint256 circuitId_) {
        require(ownership_ != address(0), "ZERO_OWNERSHIP_ADAPTER");
        require(circuitId_ > 0, "ZERO_CIRCUIT");
        ownership = ICircuitPodOwnership(ownership_);
        circuitId = circuitId_;
    }

    function owner() public view returns (address) {
        return ownership.ownerOf(circuitId);
    }

    function execute(address target, uint256 value, bytes calldata data) external onlyOwner returns (bytes memory result) {
        require(target != address(0), "ZERO_TARGET");
        (bool ok, bytes memory returned) = target.call{value: value}(data);
        if (!ok) _bubble(returned);
        emit Executed(target, value, data, returned);
        return returned;
    }

    function recoverERC20(address token, address recipient, uint256 amount) external onlyOwner {
        require(token != address(0) && recipient != address(0), "ZERO_ADDRESS");
        (bool ok, bytes memory returned) = token.call(abi.encodeWithSelector(0xa9059cbb, recipient, amount));
        require(ok && (returned.length == 0 || abi.decode(returned, (bool))), "ERC20_TRANSFER_FAILED");
        emit ERC20Recovered(token, recipient, amount);
    }

    receive() external payable {}

    modifier onlyOwner() {
        require(msg.sender == owner(), "NOT_CIRCUIT_OWNER");
        _;
    }

    function _bubble(bytes memory returned) private pure {
        if (returned.length == 0) revert("EXECUTION_FAILED");
        assembly { revert(add(returned, 32), mload(returned)) }
    }
}
