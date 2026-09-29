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
cp .env.formal.example .env.local
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

As of September 29, 2026, the formal Processor, Circuit #1, official Container, Registry, Router, Factory and stable Pod Account are live. The formal Manifest is published, the formal DeWeb release is live, a real paid Router call emitted `UsageReceipt #1`, and Pod/Processor withdrawals are recorded in the deployment metadata. The Processor eval ABI succeeds in an X Layer read call, and Pod control resolves to the current Circuit owner.

The old TapeKit identity `tape://1.2.177.tape/` is test history. The formal DeWeb identity is `tape://1.2.248.tape/`. Ownership handoff is an implemented lifecycle path and an optional follow-up demonstration; it is not represented as a completed transfer in this submission.

## 6. Evidence map

| Claim | Where to verify it |
| --- | --- |
| TapeOut identity and Circuit #1 | [`deployments/xlayer-mainnet.json`](../deployments/xlayer-mainnet.json) and the TapeOut links in [`SUBMISSION.md`](../SUBMISSION.md) |
| Official Container binding | `npm run verify:deployment` and the Container fields in the deployment metadata |
| X Layer protocol contracts | Registry, Router, Factory and Pod addresses in [`SUBMISSION.md`](../SUBMISSION.md) |
| Paid execution and revenue | UsageReceipt and withdrawal transactions in [`docs/SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md) |
| Public service and Manifest | [formal DeWeb gateway](https://1-2-248.tapekit.org/) and [`public/manifests/circuit-1-v1.0.1.json`](../public/manifests/circuit-1-v1.0.1.json) |

