// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/CircuitRevenueVault.sol";

interface Vm {
    function warp(uint256 timestamp) external;
    function deal(address account, uint256 balance) external;
}

contract MockRouter {
    mapping(address => uint256) public pending;

    receive() external payable {}

    function credit(address account) external payable {
        pending[account] += msg.value;
    }

    function withdraw() external {
        uint256 amount = pending[msg.sender];
        pending[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "MOCK_WITHDRAW_FAILED");
    }
}

contract CircuitRevenueVaultTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    MockRouter private router;
    CircuitRevenueVault private vault;

    receive() external payable {}

    function setUp() public {
        vm.deal(address(this), 100 ether);
        router = new MockRouter();
        vault = new CircuitRevenueVault(address(router), 7, keccak256("manifest-v1"), block.timestamp + 30 days, 10 ether);
    }

    function testRevenueBeforeFirstDepositRemainsInRouter() public {
        router.credit{value: 1 ether}(address(vault));
        (bool synced,) = address(vault).call(abi.encodeCall(vault.syncRevenue, ()));
        require(!synced, "SYNC_SHOULD_FAIL_WITHOUT_YT");
        require(router.pending(address(vault)) == 1 ether, "ROUTER_BALANCE_WAS_LOST");

        vault.deposit{value: 1 ether}();
        vault.syncRevenue();
        vault.transferYT(address(0xBEEF), 0);
        require(vault.pendingYield(address(this)) == 1 ether, "REVENUE_NOT_ALLOCATED");
    }

    function testDepositCapIsEnforced() public {
        (bool deposited,) = address(vault).call{value: 11 ether}(abi.encodeCall(vault.deposit, ()));
        require(!deposited, "CAP_NOT_ENFORCED");
    }

    function testPTCannotRedeemBeforeMaturity() public {
        vault.deposit{value: 1 ether}();
        (bool redeemed,) = address(vault).call(abi.encodeCall(vault.redeemPT, ()));
        require(!redeemed, "EARLY_REDEMPTION_ALLOWED");
    }

    function testPTRedeemsAtMaturity() public {
        vault.deposit{value: 1 ether}();
        vm.warp(vault.maturity());
        vault.redeemPT();
        require(vault.totalPrincipal() == 0, "PRINCIPAL_NOT_BURNED");
        require(vault.ptBalanceOf(address(this)) == 0, "PT_NOT_BURNED");
    }

    function testYTTransferSettlesAccruedRevenueBeforeTransfer() public {
        vault.deposit{value: 1 ether}();
        router.credit{value: 1 ether}(address(vault));
        vault.syncRevenue();
        address buyer = address(0xBEEF);
        vault.transferYT(buyer, 0.4 ether);
        require(vault.pendingYield(address(this)) == 1 ether, "SELLER_ACCRUAL_WRONG");
        require(vault.pendingYield(buyer) == 0, "BUYER_RECEIVED_PAST_REVENUE");
        require(vault.ytBalanceOf(buyer) == 0.4 ether, "YT_TRANSFER_FAILED");
    }
}
