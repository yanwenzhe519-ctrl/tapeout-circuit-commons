// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/CircuitPodAccount.sol";

interface Vm {
    function deal(address account, uint256 balance) external;
}

contract PodOwnershipMock {
    address public currentOwner;
    constructor(address owner_) { currentOwner = owner_; }
    function ownerOf(uint256) external view returns (address) { return currentOwner; }
    function setOwner(address owner_) external { currentOwner = owner_; }
}

contract PodTarget {
    uint256 public value;
    function setValue(uint256 value_) external payable { value = value_; }
}

contract CircuitPodAccountTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    PodOwnershipMock private ownership;
    CircuitPodAccount private pod;
    PodTarget private target;

    function setUp() public {
        ownership = new PodOwnershipMock(address(this));
        pod = new CircuitPodAccount(address(ownership), 1);
        target = new PodTarget();
        vm.deal(address(this), 1 ether);
    }

    function testCurrentCircuitOwnerControlsStablePod() public {
        pod.execute(address(target), 0, abi.encodeCall(target.setValue, (42)));
        require(target.value() == 42, "OWNER_CANNOT_EXECUTE");
        ownership.setOwner(address(0xBEEF));
        (bool ok,) = address(pod).call(abi.encodeCall(pod.execute, (address(target), 0, abi.encodeCall(target.setValue, (7)))));
        require(!ok, "OLD_OWNER_RETAINED_CONTROL");
    }
}
