// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/CircuitCommonsRegistry.sol";
import "../contracts/CircuitCommonsRouter.sol";
import "../contracts/CircuitPodFactory.sol";

interface Vm {
    function deal(address account, uint256 balance) external;
}

contract MockTapeOutOwnership {
    address public circuitOwner;

    constructor(address owner_) { circuitOwner = owner_; }
    function ownerOf(uint256) external view returns (address) { return circuitOwner; }
    function transfer(address nextOwner) external { circuitOwner = nextOwner; }
}

contract MockTapeOutProcessor {
    function eval(uint256, bytes calldata inputs) external pure returns (bytes memory) { return inputs; }
    function withdrawFrom(CircuitCommonsRouter router) external { router.withdraw(); }
    receive() external payable {}
}

contract MockContainerAdapter {
    address public account;
    constructor(address account_) { account = account_; }
    function accountOf(address, uint256) external view returns (address) { return account; }
    function isOpened(address, uint256) external pure returns (bool) { return true; }
}

contract NonOwnerPublisher {
    function publish(CircuitCommonsRegistry registry) external {
        registry.publish(1, keccak256("manifest"), "ipfs://bafy-manifest", 1 ether, 8000, 1500);
    }
}

contract CurrentOwnerPublisher {
    function publish(CircuitCommonsRegistry registry) external {
        registry.publish(1, keccak256("manifest-v2"), "ipfs://bafy-v2", 1 ether, 7000, 2000);
    }
    function deactivate(CircuitCommonsRegistry registry) external {
        registry.setActive(1, false);
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
        registry = new CircuitCommonsRegistry(address(ownership), address(this));
        router = new CircuitCommonsRouter(address(registry), address(processor), address(processor), address(this));
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

    function testNewCircuitOwnerCanRepublishAndControlManifest() public {
        registry.setRevenueRecipient(1, address(0));
        CurrentOwnerPublisher nextOwner = new CurrentOwnerPublisher();
        ownership.transfer(address(nextOwner));
        (bool published,) = address(nextOwner).call(abi.encodeCall(nextOwner.publish, (registry)));
        require(published, "NEW_OWNER_CANNOT_REPUBLISH");
        (bool deactivated,) = address(nextOwner).call(abi.encodeCall(nextOwner.deactivate, (registry)));
        require(deactivated, "NEW_OWNER_CANNOT_SET_ACTIVE");
    }

    function testFactoryCreatesOnePodAndLocksRevenueToPod() public {
        MockContainerAdapter container = new MockContainerAdapter(address(0xCAFE));
        CircuitCommonsRegistry factoryRegistry = new CircuitCommonsRegistry(address(ownership), address(this));
        CircuitPodFactory factory = new CircuitPodFactory(address(ownership), address(factoryRegistry), address(container), address(processor));
        factoryRegistry.setFactory(address(factory));
        address podAddress = factory.createPod(1, keccak256("service"), "ipfs://service");
        require(factory.podOf(1) == podAddress, "POD_NOT_RECORDED");
        factoryRegistry.publish(1, keccak256("manifest"), "ipfs://manifest", 1 ether, 8000, 1500);
        (, , , , , address recipient, , ) = factoryRegistry.manifests(1);
        require(recipient == podAddress, "REVENUE_NOT_BOUND_TO_POD");
        (bool duplicate,) = address(factory).call(abi.encodeCall(factory.createPod, (1, keccak256("service2"), "ipfs://service2")));
        require(!duplicate, "DUPLICATE_POD_CREATED");
        (bool oldWalletRecipient,) = address(factoryRegistry).call(abi.encodeCall(factoryRegistry.setRevenueRecipient, (1, address(0xBEEF))));
        require(!oldWalletRecipient, "POD_REVENUE_UNLOCKED");
    }
}
