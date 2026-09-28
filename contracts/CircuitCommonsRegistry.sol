// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICircuitOwner {
    function ownerOf(uint256 circuitId) external view returns (address);
}

/// @notice Manifest registry bound to a TapeOut circuit ownership adapter.
/// The adapter must expose the canonical ownerOf(uint256) for the target
/// TapeOut deployment; do not deploy with a permissive or user-controlled adapter.
contract CircuitCommonsRegistry {
    struct Manifest {
        address publisher;
        bytes32 hash;
        uint256 price;
        uint16 creatorBps;
        uint16 processorBps;
        address revenueRecipient;
        string manifestURI;
        bool active;
    }

    mapping(uint256 => Manifest) public manifests;
    struct PodMetadata {
        address podAccount;
        address containerAdapter;
        address container;
        bytes32 serviceHash;
        string serviceURI;
        uint64 version;
    }
    mapping(uint256 => PodMetadata) public podMetadata;
    ICircuitOwner public immutable ownership;
    address public immutable owner;
    address public factory;

    event ManifestPublished(uint256 indexed circuitId, address indexed publisher, bytes32 indexed hash, uint256 price, uint16 creatorBps, uint16 processorBps, string manifestURI);
    event RevenueRecipientChanged(uint256 indexed circuitId, address indexed recipient);
    event ManifestStatusChanged(uint256 indexed circuitId, bool active);
    event FactoryChanged(address indexed factory);
    event PodRegistered(uint256 indexed circuitId, address indexed podAccount, address indexed container, bytes32 serviceHash, string serviceURI, uint64 version);

    constructor(address ownership_, address owner_) {
        require(ownership_ != address(0), "ZERO_OWNERSHIP_ADAPTER");
        require(owner_ != address(0), "ZERO_REGISTRY_OWNER");
        owner = owner_;
        ownership = ICircuitOwner(ownership_);
    }

    function setFactory(address factory_) external {
        require(msg.sender == owner, "NOT_REGISTRY_OWNER");
        require(factory_ != address(0), "ZERO_FACTORY");
        require(factory == address(0), "FACTORY_ALREADY_SET");
        factory = factory_;
        emit FactoryChanged(factory_);
    }

    function registerPod(uint256 circuitId, address podAccount, address containerAdapter, address container, bytes32 serviceHash, string calldata serviceURI) external {
        require(msg.sender == factory, "NOT_FACTORY");
        require(ownership.ownerOf(circuitId) != address(0), "UNKNOWN_CIRCUIT");
        require(podAccount != address(0) && containerAdapter != address(0) && container != address(0), "ZERO_ASSET");
        require(podMetadata[circuitId].podAccount == address(0), "POD_ALREADY_REGISTERED");
        require(serviceHash != bytes32(0), "EMPTY_SERVICE_HASH");
        require(bytes(serviceURI).length > 0, "EMPTY_SERVICE_URI");
        podMetadata[circuitId] = PodMetadata(podAccount, containerAdapter, container, serviceHash, serviceURI, 1);
        emit PodRegistered(circuitId, podAccount, container, serviceHash, serviceURI, 1);
    }

    function publish(uint256 circuitId, bytes32 manifestHash, string calldata manifestURI, uint256 price, uint16 creatorBps, uint16 processorBps) external {
        require(ownership.ownerOf(circuitId) == msg.sender, "NOT_CIRCUIT_OWNER");
        require(manifestHash != bytes32(0), "EMPTY_HASH");
        require(bytes(manifestURI).length > 0, "EMPTY_URI");
        require(price > 0, "ZERO_PRICE");
        require(uint256(creatorBps) + uint256(processorBps) <= 10000, "BAD_SPLIT");
        Manifest storage current = manifests[circuitId];
        PodMetadata storage pod = podMetadata[circuitId];
        if (pod.podAccount != address(0)) {
            require(current.revenueRecipient == address(0) || current.revenueRecipient == pod.podAccount, "POD_REVENUE_LOCKED");
            current.revenueRecipient = pod.podAccount;
        } else {
            require(current.revenueRecipient == address(0), "UNSET_REVENUE_RECIPIENT");
        }
        current.publisher = msg.sender;
        current.hash = manifestHash;
        current.manifestURI = manifestURI;
        current.price = price;
        current.creatorBps = creatorBps;
        current.processorBps = processorBps;
        current.active = true;
        emit ManifestPublished(circuitId, msg.sender, manifestHash, price, creatorBps, processorBps, manifestURI);
    }

    function setRevenueRecipient(uint256 circuitId, address recipient) external {
        Manifest storage current = manifests[circuitId];
        require(ownership.ownerOf(circuitId) == msg.sender, "NOT_CIRCUIT_OWNER");
        address pod = podMetadata[circuitId].podAccount;
        require(pod == address(0) || recipient == pod, "POD_REVENUE_LOCKED");
        current.revenueRecipient = recipient;
        emit RevenueRecipientChanged(circuitId, recipient);
    }

    function setActive(uint256 circuitId, bool active) external {
        require(ownership.ownerOf(circuitId) == msg.sender, "NOT_CIRCUIT_OWNER");
        manifests[circuitId].active = active;
        emit ManifestStatusChanged(circuitId, active);
    }
}
