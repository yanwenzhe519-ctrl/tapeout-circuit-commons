// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {CircuitPodAccount} from "../contracts/CircuitPodAccount.sol";
import {CircuitCommonsRegistry} from "../contracts/CircuitCommonsRegistry.sol";
import {CircuitCommonsRouter} from "../contracts/CircuitCommonsRouter.sol";
import {CircuitRevenueVault} from "../contracts/CircuitRevenueVault.sol";
import {CircuitPodFactory} from "../contracts/CircuitPodFactory.sol";

/// @notice Deploys the current Circuit Commons protocol set on X Layer.
/// Required env: TAPEOUT_OWNERSHIP_ADAPTER, TAPEOUT_PROCESSOR,
/// PROCESSOR_RECIPIENT, COMMONS_RECIPIENT, CIRCUIT_ID. Optional vault deployment is enabled by
/// DEPLOY_REVENUE_VAULT=true and requires MANIFEST_HASH, VAULT_MATURITY,
/// and VAULT_CAP.
contract DeployScript is Script {
    function run() external {
        address ownership = vm.envAddress("TAPEOUT_OWNERSHIP_ADAPTER");
        address processor = vm.envAddress("TAPEOUT_PROCESSOR");
        address processorRecipient = vm.envAddress("PROCESSOR_RECIPIENT");
        address commonsRecipient = vm.envAddress("COMMONS_RECIPIENT");
        uint256 circuitId = vm.envUint("CIRCUIT_ID");
        require(circuitId > 0, "CIRCUIT_ID_ZERO");
        require(commonsRecipient != address(0), "ZERO_COMMONS_RECIPIENT");
        require(processorRecipient.code.length == 0, "PROCESSOR_RECIPIENT_MUST_BE_EOA");
        require(commonsRecipient.code.length == 0, "COMMONS_RECIPIENT_MUST_BE_EOA");

        vm.startBroadcast();
        CircuitPodAccount pod = new CircuitPodAccount(ownership, circuitId);
        CircuitCommonsRegistry registry = new CircuitCommonsRegistry(ownership, msg.sender);
        CircuitCommonsRouter router = new CircuitCommonsRouter(address(registry), processor, processorRecipient, commonsRecipient);
        address containerAdapter = vm.envAddress("TAPEOUT_CONTAINER_ADAPTER");
        CircuitPodFactory factory = new CircuitPodFactory(ownership, address(registry), containerAdapter, processor);
        registry.setFactory(address(factory));

        address vault = address(0);
        if (vm.envOr("DEPLOY_REVENUE_VAULT", false)) {
            bytes32 manifestHash = vm.envBytes32("MANIFEST_HASH");
            uint256 maturity = vm.envUint("VAULT_MATURITY");
            uint256 cap = vm.envUint("VAULT_CAP");
            vault = address(new CircuitRevenueVault(address(router), circuitId, manifestHash, maturity, cap));
        }
        vm.stopBroadcast();

        console2.log("CircuitPodAccount", address(pod));
        console2.log("CircuitCommonsRegistry", address(registry));
        console2.log("CircuitCommonsRouter", address(router));
        console2.log("CircuitPodFactory", address(factory));
        console2.log("CircuitRevenueVault", vault);
    }
}
