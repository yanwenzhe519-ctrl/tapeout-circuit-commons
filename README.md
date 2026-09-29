# Circuit Commons

[![CI](https://github.com/yanwenzhe519-ctrl/tapeout-circuit-commons/actions/workflows/ci.yml/badge.svg)](https://github.com/yanwenzhe519-ctrl/tapeout-circuit-commons/actions/workflows/ci.yml)
[![X Layer](https://img.shields.io/badge/X%20Layer-chain%20196-111827)](https://www.okx.com/web3/explorer/xlayer)
[![TapeOut](https://img.shields.io/badge/TapeOut-Circuit%20%231-14b8a6)](https://tapeout.net/)
[![Status](https://img.shields.io/badge/status-mainnet%20prototype-f45f4b)](#production-state)

**Turn a taped-out TapeOut Circuit into a verified, payable and handoff-ready application on X Layer.**

Circuit Commons connects TapeOut's permanent compute identity to X Layer payment, receipts, revenue and DeWeb delivery. A Circuit Pod packages the real Circuit, official Container, service Manifest, stable Pod Account, revenue policy and operating history into one application boundary.

[Open the live app](https://yanwenzhe519-ctrl.github.io/tapeout-circuit-commons/) · [Open the formal DeWeb gateway](https://1-2-248.tapekit.org/) · [Read the judge guide](docs/JUDGE_GUIDE.md) · [Submission checklist](docs/SUBMISSION_CHECKLIST.md) · [Inspect the deployment](deployments/xlayer-mainnet.json) · [View the Manifest](public/manifests/circuit-1-v1.0.1.json)

![Circuit Commons overview](docs/assets/overview.png)

## The problem

A TapeOut Circuit can be permanent and transferable, but the application around it is normally fragmented across unrelated addresses and systems. The Circuit identifies the compute, the Container hosts the DeWeb surface, a treasury holds assets and revenue, configuration lives in off-chain files, and the current operator holds deployment permissions. Transferring only the Circuit can therefore break the application or strand its assets.

## The product

Circuit Commons creates a Circuit Pod with a stable X Layer address. Its controller is resolved from TapeOut's canonical Circuit ownership, so ownership can change while the Pod address, assets and history stay in place. This is not a file-notarization service and not another domain marketplace. It is an executable lifecycle protocol:

1. Verify the real Circuit owner and official Container.
2. Create one stable Pod Account for the Circuit.
3. Publish a content-addressed Manifest with pricing and revenue policy.
4. Route paid Circuit execution through X Layer and emit auditable receipts.
5. Credit creator, Processor and Pod revenue using pull payments.
6. Transfer the Circuit and verify that the same Pod, Container, Manifest and revenue account are controlled by the new owner.

## Architecture

~~~mermaid
flowchart LR
    C[TapeOut Circuit] --> O[Canonical ownerOf]
    C --> T[Official Container]
    O --> P[Stable Pod Account]
    T --> P
    M[Versioned Manifest] --> R[Commons Registry]
    P --> R
    U[User pays OKB] --> X[Commons Router]
    X --> E[TapeOut Processor eval]
    X --> Q[UsageReceipt]
    X --> S[Creator / Processor / Pod splits]
    O -. ownership changes .-> N[New operator]
    N --> P
~~~

## Three-minute judge path

1. Open the [live app](https://yanwenzhe519-ctrl.github.io/tapeout-circuit-commons/) without a wallet and inspect Circuit #1, its official Container, Pod Account and Manifest.
2. Open the [formal DeWeb gateway](https://1-2-248.tapekit.org/) and compare the public service surface with the Manifest.
3. Run the release verifier locally:

~~~bash
npm install
cp .env.formal.example .env.local
npm run verify:release
~~~

This validates the production build, X Layer chain ID 196, deployed bytecode, official Container state, Pod binding and the public Manifest hash. The full narrative and transaction evidence are in [SUBMISSION.md](SUBMISSION.md), [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) and [docs/JUDGE_GUIDE.md](docs/JUDGE_GUIDE.md).

![Verified Circuit registry](docs/assets/registry.png)

## Production state

The formal `Circuit Commons / CCOM` Processor, Circuit #1 official Container, Registry, Router, Factory and stable Pod Account are live on X Layer. The formal Manifest is published, the Registry points to the live DeWeb release, and a real paid call has produced `UsageReceipt #1`. Creator/Processor and Pod withdrawals are recorded in [the deployment evidence](deployments/xlayer-mainnet.json). The handoff control path is implemented, but no ownership transfer is presented as completed production evidence.

## X Layer addresses

| Component | Address |
| --- | --- |
| Formal Registry | 0x0A67B77e27004cc54A79207335179B7E6D29257D |
| Formal Router | 0x8f1f0224c4B6e775a0c68E31fef374dAAD605D00 |
| Formal Pod Factory | 0x6262E61e955a9fa8E923D44341F085f6041509aC |
| Formal TapeOut Processor / ownership adapter target | 0xC658d4FCe1bD1b2E36e9d2c36832E933abe9189F |
| Formal transistor contract | 0x70737D8fdc1f9c99Bf5cc356F4Fc154f72307370 |
| Formal Circuit #1 Container | 0xb67E375c873E1F278A52E215300B42831eDDC641 |
| Container adapter | 0x536add8f30f03b69f6fbf29d425a816a0dc50106 |
| Formal Circuit #1 Pod Account | 0xb4cAE1414c31158fCEDE3A2ad01F1C176e7809C0 |

## Why it fits the competition

Circuit Commons combines a clear application scenario with deep TapeOut integration and a real X Layer settlement layer. The Circuit and its official Container are verified on-chain; the Pod preserves the operating boundary across ownership transfer; the Router turns usage into receipts and explicit creator, Processor and Pod revenue; and the UI guides a creator through setup while keeping ordinary inspection wallet-free. The economic design uses a Circuit Pod account rather than a speculative token, and the contracts enforce owner checks, exact prices, bounded splits, pull withdrawals and reentrancy protection.

## Competition evidence at a glance

| Requirement / judging dimension | Evidence in this repository |
| --- | --- |
| Processor deployed through TapeOut factory on X Layer | Formal Processor `0xC658...9189F`, factory `0x1f09...0761`, creation transaction in [`deployments/xlayer-mainnet.json`](deployments/xlayer-mainnet.json) |
| Supply, unit price and cap disclosed | `1,000,000,000` cap, `50` minted, `0.000066 OKB` unit price, formal transistor contract recorded in deployment metadata |
| At least one completed tapeout | Circuit #1 `TapedOut` transaction and `47` gates recorded in deployment metadata |
| Clear application and usable demo | Live Pod Controller: [GitHub Pages app](https://yanwenzhe519-ctrl.github.io/tapeout-circuit-commons/) and [DeWeb](https://1-2-248.tapekit.org/) |
| TapeOut integration depth | Canonical `ownerOf`, official Container adapter, Circuit ID and Container binding are verified by `npm run verify:deployment` |
| X Layer integration quality | Registry, Router, Factory and Pod Account are deployed on chain 196; exact-price OKB execution emits `UsageReceipt` |
| Asset / revenue design | Stable Pod Account binds service, Container, treasury boundary and revenue policy; pull withdrawals are evidenced in the deployment record |
| Security and economic model | Owner-gated publishing, exact-price checks, bounded BPS splits, immutable trust anchors, reentrancy lock and pull payments; scope is documented in [`SECURITY.md`](SECURITY.md) |
| User growth potential | Wallet-free inspection, one exact-price call for end users, and a reusable Pod model for AI services, games, agents and data products |

See [`SUBMISSION.md`](SUBMISSION.md) and [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md) for transaction-level hashes and the full narrative.

## Repository map

| Path | Purpose |
| --- | --- |
| contracts/ | Registry, Router, Factory, Pod Account and optional Revenue Vault |
| src/ | Product UI and X Layer integration |
| script/ | Foundry deployment and configuration scripts |
| scripts/ | Build, Manifest, deployment and verification tooling |
| test/ | Solidity regression tests |
| public/manifests/ | Public Circuit Manifest |
| deployments/ | Auditable mainnet deployment metadata |
| publisher.html | Wallet-connected TapeKit DeWeb publisher |

## Local development

~~~bash
npm install
cp .env.example .env.local
npm run dev
~~~

The application fails closed when required addresses are absent. Private keys are never accepted by the frontend. With Foundry installed, run:

~~~bash
forge test -vvv
~~~

## Security scope

This is a mainnet prototype, not an independently audited custody product. The contracts use immutable trust anchors, canonical Circuit-owner checks, exact-price execution, bounded basis-point splits, pull-payment withdrawals and a reentrancy lock. See [SECURITY.md](SECURITY.md).

## Further reading

- [Hackathon submission](SUBMISSION.md)
- [Judge verification guide](docs/JUDGE_GUIDE.md)
- [Deployment guide](DEPLOYMENT.md)
- [Product design](DESIGN.md)
- [Demo video script](VIDEO_SCRIPT.md)

