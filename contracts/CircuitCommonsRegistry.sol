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
    ICircuitOwner public immutable ownership;
    address public immutable owner;

    event ManifestPublished(uint256 indexed circuitId, address indexed publisher, bytes32 indexed hash, uint256 price, uint16 creatorBps, uint16 processorBps, string manifestURI);
    event RevenueRecipientChanged(uint256 indexed circuitId, address indexed recipient);
    event ManifestStatusChanged(uint256 indexed circuitId, bool active);

    constructor(address ownership_) {
        require(ownership_ != address(0), "ZERO_OWNERSHIP_ADAPTER");
        owner = msg.sender;
        ownership = ICircuitOwner(ownership_);
    }

    function publish(uint256 circuitId, bytes32 manifestHash, string calldata manifestURI, uint256 price, uint16 creatorBps, uint16 processorBps) external {
        require(ownership.ownerOf(circuitId) == msg.sender, "NOT_CIRCUIT_OWNER");
        require(manifestHash != bytes32(0), "EMPTY_HASH");
        require(bytes(manifestURI).length > 0, "EMPTY_URI");
        require(price > 0, "ZERO_PRICE");
        require(uint256(creatorBps) + uint256(processorBps) <= 10000, "BAD_SPLIT");
        Manifest storage current = manifests[circuitId];
        require(current.publisher == address(0) || current.publisher == msg.sender, "NOT_PUBLISHER");
        require(current.revenueRecipient == address(0), "UNSET_REVENUE_RECIPIENT");
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
        require(current.publisher == msg.sender, "NOT_PUBLISHER");
        current.revenueRecipient = recipient;
        emit RevenueRecipientChanged(circuitId, recipient);
    }

    function setActive(uint256 circuitId, bool active) external {
        require(manifests[circuitId].publisher == msg.sender, "NOT_PUBLISHER");
        manifests[circuitId].active = active;
        emit ManifestStatusChanged(circuitId, active);
    }
}
