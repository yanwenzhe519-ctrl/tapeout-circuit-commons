// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CircuitPodAccount} from "./CircuitPodAccount.sol";

interface IFactoryOwnership { function ownerOf(uint256 circuitId) external view returns (address); }
interface IContainerAccount { function accountOf(address processor, uint256 circuitId) external view returns (address); function isOpened(address processor, uint256 circuitId) external view returns (bool); }
interface IFactoryRegistry { function registerPod(uint256 circuitId, address podAccount, address containerAdapter, address container, bytes32 serviceHash, string calldata serviceURI) external; }

contract CircuitPodFactory {
    IFactoryOwnership public immutable ownership;
    IFactoryRegistry public immutable registry;
    IContainerAccount public immutable containerAdapter;
    address public immutable processor;
    mapping(uint256 => address) public podOf;
    event PodCreated(uint256 indexed circuitId, address indexed podAccount, address indexed container, bytes32 serviceHash, string serviceURI);

    constructor(address ownership_, address registry_, address containerAdapter_, address processor_) {
        require(ownership_ != address(0) && registry_ != address(0) && containerAdapter_ != address(0) && processor_ != address(0), "ZERO_ADDRESS");
        ownership = IFactoryOwnership(ownership_);
        registry = IFactoryRegistry(registry_);
        containerAdapter = IContainerAccount(containerAdapter_);
        processor = processor_;
    }

    function createPod(uint256 circuitId, bytes32 serviceHash, string calldata serviceURI) external returns (address pod) {
        require(ownership.ownerOf(circuitId) == msg.sender, "NOT_CIRCUIT_OWNER");
        require(podOf[circuitId] == address(0), "POD_ALREADY_CREATED");
        require(serviceHash != bytes32(0) && bytes(serviceURI).length > 0, "INVALID_SERVICE");
        require(containerAdapter.isOpened(processor, circuitId), "CONTAINER_NOT_OPENED");
        address container = containerAdapter.accountOf(processor, circuitId);
        require(container != address(0), "CONTAINER_NOT_FOUND");
        pod = address(new CircuitPodAccount(address(ownership), circuitId));
        podOf[circuitId] = pod;
        registry.registerPod(circuitId, pod, address(containerAdapter), container, serviceHash, serviceURI);
        emit PodCreated(circuitId, pod, container, serviceHash, serviceURI);
    }
}
