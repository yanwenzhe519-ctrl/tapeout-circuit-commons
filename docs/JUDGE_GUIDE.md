# Judge Guide

This page provides a short, reproducible review path for Circuit Commons.

## 1. Understand the product

Circuit Commons turns a TapeOut Circuit into a transferable application unit on X Layer:

Circuit + official Container + stable Pod Account + assets + revenue policy + service configuration + operating history

The critical distinction is that the Circuit changes owner while the Pod address and its state remain unchanged.

## 2. Inspect the public product

- Application: https://yanwenzhe519-ctrl.github.io/tapeout-circuit-commons/
- Circuit: #1
- Pod Account: 0x5FeB9c3884Cf69b0A960087E66d3b6638BE00eb6
- Official Container: 0x25A1D87789aE72E326B3A987F610F08219aA0764
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

As of September 28, 2026, infrastructure is deployed and a read-only mainnet simulation of runEval succeeds. The Router has not yet emitted its first paid UsageReceipt, and the real ownership-handoff transaction remains final demo evidence. The UI and verification logic for both flows are implemented; the repository does not label simulated evidence as a completed transaction.

The TapeKit identity tape://1.2.177.tape/ is reserved, but the gateway activation payment is still pending.

