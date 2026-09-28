// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {CircuitCommonsRegistry} from "../contracts/CircuitCommonsRegistry.sol";

/// @notice Configures a deployed Registry from the current TapeOut Circuit
/// owner wallet. Run this with the owner key after publishing a manifest.
contract ConfigureScript is Script {
    function run() external {
        address registry = vm.envAddress("REGISTRY_ADDRESS");
        uint256 circuitId = vm.envUint("CIRCUIT_ID");
        address recipient = vm.envAddress("REVENUE_RECIPIENT");
        vm.startBroadcast();
        CircuitCommonsRegistry(registry).setRevenueRecipient(circuitId, recipient);
        vm.stopBroadcast();
        console2.log("Revenue recipient configured", recipient);
    }
}
