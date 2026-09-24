// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICircuitCommonsRegistry {
    function manifests(uint256 circuitId) external view returns (address publisher, bytes32 hash, uint256 price, uint16 creatorBps, uint16 processorBps, address revenueRecipient, string memory manifestURI, bool active);
}

/// @notice Payment and receipt boundary. A production deployment should point
/// `processor` at the TapeOut Processor adapter verified for the target chain.
interface ITapeOutProcessor {
    function eval(uint256 circuitId, bytes calldata inputs) external view returns (bytes memory output);
}

contract CircuitCommonsRouter {
    ICircuitCommonsRegistry public immutable registry;
    ITapeOutProcessor public immutable processor;
    address public immutable commons;
    uint256 public nextReceiptId = 1;
    uint256 private locked = 1;

    mapping(address => uint256) public pendingWithdrawals;

    event UsageReceipt(uint256 indexed receiptId, uint256 indexed circuitId, address indexed caller, bytes32 inputHash, bytes32 outputHash, uint256 amount, address creator, address processorRecipient, address commonsRecipient);
    event WithdrawalCredited(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    constructor(address registry_, address processor_, address commons_) {
        require(registry_ != address(0) && processor_ != address(0) && commons_ != address(0), "ZERO_ADDRESS");
        registry = ICircuitCommonsRegistry(registry_);
        processor = ITapeOutProcessor(processor_);
        commons = commons_;
    }

    function runEval(uint256 circuitId, bytes calldata inputs) external payable returns (uint256 receiptId) {
        require(locked == 1, "REENTRANT");
        locked = 2;
        (address creator, , uint256 price, uint16 creatorBps, uint16 processorBps, address revenueRecipient, , bool active) = registry.manifests(circuitId);
        require(active && creator != address(0), "INACTIVE_CIRCUIT");
        require(msg.value == price, "WRONG_PRICE");
        require(uint256(creatorBps) + uint256(processorBps) <= 10000, "BAD_SPLIT");
        bytes memory output = processor.eval(circuitId, inputs);
        receiptId = nextReceiptId++;
        uint256 creatorAmount = (msg.value * creatorBps) / 10000;
        uint256 processorAmount = (msg.value * processorBps) / 10000;
        address creatorRecipient = revenueRecipient == address(0) ? creator : revenueRecipient;
        _credit(creatorRecipient, creatorAmount);
        _credit(address(processor), processorAmount);
        _credit(commons, msg.value - creatorAmount - processorAmount);
        _emitUsageReceipt(receiptId, circuitId, inputs, output, creatorRecipient);
        locked = 1;
    }

    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) return;
        pendingWithdrawals[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "WITHDRAW_FAILED");
        emit Withdrawal(msg.sender, amount);
    }

    function _credit(address recipient, uint256 amount) private {
        if (amount == 0) return;
        pendingWithdrawals[recipient] += amount;
        emit WithdrawalCredited(recipient, amount);
    }

    function _emitUsageReceipt(uint256 receiptId, uint256 circuitId, bytes calldata inputs, bytes memory output, address creatorRecipient) private {
        emit UsageReceipt(receiptId, circuitId, msg.sender, keccak256(inputs), keccak256(output), msg.value, creatorRecipient, address(processor), commons);
    }
}
