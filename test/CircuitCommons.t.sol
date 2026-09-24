// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/CircuitCommonsRegistry.sol";
import "../contracts/CircuitCommonsRouter.sol";

interface Vm {
    function deal(address account, uint256 balance) external;
}

contract MockTapeOutOwnership {
    address public circuitOwner;

    constructor(address owner_) { circuitOwner = owner_; }
    function ownerOf(uint256) external view returns (address) { return circuitOwner; }
}

contract MockTapeOutProcessor {
    function eval(uint256, bytes calldata inputs) external pure returns (bytes memory) { return inputs; }
    function withdrawFrom(CircuitCommonsRouter router) external { router.withdraw(); }
    receive() external payable {}
}

contract NonOwnerPublisher {
    function publish(CircuitCommonsRegistry registry) external {
        registry.publish(1, keccak256("manifest"), "ipfs://bafy-manifest", 1 ether, 8000, 1500);
    }
}

contract CircuitCommonsTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    MockTapeOutOwnership private ownership;
    MockTapeOutProcessor private processor;
    CircuitCommonsRegistry private registry;
    CircuitCommonsRouter private router;

    receive() external payable {}

    function setUp() public {
        vm.deal(address(this), 100 ether);
        ownership = new MockTapeOutOwnership(address(this));
        processor = new MockTapeOutProcessor();
        registry = new CircuitCommonsRegistry(address(ownership));
        router = new CircuitCommonsRouter(address(registry), address(processor), address(this));
        registry.publish(1, keccak256("manifest-v1"), "ipfs://bafy-manifest-v1", 1 ether, 8000, 1500);
    }

    function testOwnerOnlyCanPublish() public {
        NonOwnerPublisher attacker = new NonOwnerPublisher();
        (bool ok,) = address(attacker).call(abi.encodeCall(attacker.publish, (registry)));
        require(!ok, "NON_OWNER_PUBLISHED");
    }

    function testRunSplitsExactPaymentAndPullWithdrawals() public {
        router.runEval{value: 1 ether}(1, hex"1234");
        require(router.pendingWithdrawals(address(this)) == 0.85 ether, "CREATOR_PLUS_COMMONS_SPLIT_WRONG");
        require(router.pendingWithdrawals(address(processor)) == 0.15 ether, "PROCESSOR_SPLIT_WRONG");
        router.withdraw();
        processor.withdrawFrom(router);
        require(router.pendingWithdrawals(address(this)) == 0, "CREATOR_WITHDRAW_NOT_CLEARED");
        require(router.pendingWithdrawals(address(processor)) == 0, "PROCESSOR_WITHDRAW_NOT_CLEARED");
    }

    function testWrongPriceAndInactiveCircuitFail() public {
        (bool wrongPrice,) = address(router).call{value: 2 ether}(abi.encodeCall(router.runEval, (1, hex"01")));
        require(!wrongPrice, "WRONG_PRICE_ACCEPTED");
        registry.setActive(1, false);
        (bool inactive,) = address(router).call{value: 1 ether}(abi.encodeCall(router.runEval, (1, hex"01")));
        require(!inactive, "INACTIVE_CIRCUIT_EXECUTED");
    }

    function testVaultRecipientMustBeUnsetBeforeManifestUpdate() public {
        registry.setRevenueRecipient(1, address(0xBEEF));
        (bool updated,) = address(registry).call(abi.encodeCall(registry.publish, (1, keccak256("manifest-v2"), "ipfs://bafy-v2", 1 ether, 8000, 1500)));
        require(!updated, "MANIFEST_CHANGED_WITH_OLD_VAULT");
        registry.setRevenueRecipient(1, address(0));
        registry.publish(1, keccak256("manifest-v2"), "ipfs://bafy-v2", 1 ether, 8000, 1500);
    }
}
