# Judge Guide

This page provides a short, reproducible review path for Circuit Commons.

## 1. Understand the product

Circuit Commons turns a TapeOut Circuit into a transferable application unit on X Layer:

Circuit + official Container + stable Pod Account + assets + revenue policy + service configuration + operating history

The critical distinction is that the Circuit changes owner while the Pod address and its state remain unchanged.

## 2. Inspect the public product

- Application: https://yanwenzhe519-ctrl.github.io/tapeout-circuit-commons/
- Circuit: #1
- Pod Account: 0xb4cAE1414c31158fCEDE3A2ad01F1C176e7809C0
- Official Container: 0xb67E375c873E1F278A52E215300B42831eDDC641
- Manifest: public/manifests/circuit-1-v1.0.1.json

The public site can be inspected without connecting a wallet. Wallet connection is required only for signed actions.

## 3. Verify the deployment

~~~bash
npm install
cp .env.example .env.local
npm run verify:release
~~~

Expected result:

- production build succeeds;
- X Layer chain ID is 196;
- Registry, Router, Factory and adapters have bytecode;
- Container opened=true and deployed=true;
- Factory resolves the stable Pod Account;
- Pod controller equals the current Circuit owner;
- Manifest JSON matches the on-chain hash.

## 4. Review the contracts

- contracts/CircuitCommonsRegistry.sol: owner-gated, content-addressed Manifest and Pod metadata.
- contracts/CircuitCommonsRouter.sol: exact-price Circuit execution, revenue credits and receipts.
- contracts/CircuitPodFactory.sol: one Pod per verified Circuit and official Container.
- contracts/CircuitPodAccount.sol: stable account controlled by the current Circuit owner.

With Foundry installed:

~~~bash
forge test -vvv
~~~

## 5. Current proof boundary

As of September 29, 2026, the formal Processor, Circuit #1, official Container, Registry, Router, Factory and stable Pod Account are live. The Processor real eval ABI succeeds in an X Layer read call, and Pod control resolves to the current Circuit owner.

The old TapeKit identity `tape://1.2.177.tape/` is test history. The formal Processor identity is `1.2.248`; its DeWeb release, first paid `UsageReceipt` and ownership handoff remain unclaimed until recorded on X Layer.

