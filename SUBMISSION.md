# Ignix Genesis Transistor Hackathon Submission

## TapeOut Circuit Commons

### One-line story

Circuit Commons turns a TapeOut Circuit into a transferable on-chain application: the compute, official Container, stable operating account, assets, service configuration, revenue policy and operating history stay together when control moves to a new operator on X Layer.

### Project description

TapeOut makes computation permanent, but a useful application needs more than a Circuit. A frontend may live in one place, contracts in another, revenue in a third wallet, and operational permissions in an off-chain document. Selling or handing over only the Circuit can therefore break the application or strand its assets.

Circuit Commons introduces the Circuit Pod as the missing lifecycle primitive. The Pod is a stable X Layer account controlled by the current owner of a real TapeOut Circuit. It binds the official Circuit Container, a content-addressed service Manifest, an application treasury, paid execution receipts and a revenue policy. When the Circuit changes hands, the Pod address, Container, assets and operating history remain in place while the new Circuit owner becomes the controller.

The result is not a file notarization service and not another name marketplace. It is an executable operating and handoff layer for TapeOut applications: verify the identity, package the application, settle usage in OKB, inspect the evidence, and transfer the whole operating unit without migrating state.

### Application scenario

The first live application is Circuit Commons Pod Controller, a policy circuit for checking whether a TapeOut project is ready to run, settle or hand off. Its Manifest describes the input checks and output decisions, while the X Layer Pod keeps the frontend, service configuration, receipts and revenue surface attached to Circuit #1. The same model can be reused by AI services, games, autonomous agents, data products and any other application built around a TapeOut Circuit.

### Competition fit

The innovation is the combination of identity, operation and transfer. Existing Circuit or Container marketplaces can move a name or a single asset; Circuit Commons moves the running application unit. A buyer can inspect the verified Circuit owner, official Container relationship, Manifest hash, service URI, Pod address, revenue policy and receipts before taking control. After the transfer, the same Pod remains the asset and revenue boundary, so the handoff does not require migrating funds, permissions, frontend state or historical evidence.

That product is deeply integrated with TapeOut rather than merely mentioning it: the application reads the canonical ownership relationship, verifies the official Container adapter, binds the Container account to the Circuit, stores the Processor and Circuit identifiers in the Manifest, and routes execution through the configured Processor ABI. The Pod controller is derived from ownerOf(Circuit ID), so the control plane follows TapeOut ownership rather than a private platform database. This creates a practical use case for any AI service, game, autonomous agent or data product built around a Circuit.

X Layer is the settlement and ownership rail. The formal Registry, Router, Factory and stable Pod Account are deployed and bound to the `Circuit Commons / CCOM` Processor, Circuit #1 and its official Container. A creator gets a guided flow for owner verification, Container state, Pod creation, Manifest publication, revenue inspection and handoff verification; an end user can inspect without a wallet, then sign one exact-price OKB call and receive an auditable UsageReceipt. The primary asset is the stable Pod operating account, not a speculative token.

The implementation is designed to be reviewable and safe for a mainnet prototype: owner-gated publishing, exact-price checks, bounded basis-point splits, a reentrancy lock, one Factory-created Pod per Circuit, and Pod calls restricted to the current canonical Circuit owner. Foundry regression tests and a release verifier check chain ID, bytecode, Container state, Pod binding and Manifest hash. The UI fails closed when a required address or adapter is missing, and never requests a private key. The repository is explicit that the code is not independently audited and that final paid-call and handoff transactions must be recorded as real evidence before submission.

### Public evidence

- GitHub: https://github.com/yanwenzhe519-ctrl/tapeout-circuit-commons
- Demo: https://yanwenzhe519-ctrl.github.io/tapeout-circuit-commons/
- X Layer chain ID: 196
- Formal Processor / ownership adapter target: 0xC658d4FCe1bD1b2E36e9d2c36832E933abe9189F
- Formal Processor name / symbol: Circuit Commons / CCOM
- Formal Processor deployment wallet: 0x05667de34ad47bafe8a8b976c19809cadf7719d2
- TapeOut factory: 0x1f09DAeFA827f02CBb40967cc91b259763760761
- Formal transistor supply / minted / unit price: 1,000,000,000 / 50 / 0.000066 OKB
- Formal Processor creation tx: 0xbd3029889c4946eb6e79bdd2c13c5f9c4d4e6f0a17cca8cca0c138c3d8d32e1c
- Formal transistor contract: 0x70737D8fdc1f9c99Bf5cc356F4Fc154f72307370
- Circuit #1 tapeout tx: 0xdb078cc16f0c4c7e909d43fa81cadb1609c2586efb01702b6a29ad87877bc396
- Circuit #1 Container open tx: 0x9f77805defb518030b74482a0a8b67dd36d5c8519c4ee9145f8ca18186fe4eab
- Formal Registry: 0x0A67B77e27004cc54A79207335179B7E6D29257D
- Formal Router: 0x8f1f0224c4B6e775a0c68E31fef374dAAD605D00
- Formal Factory: 0x6262E61e955a9fa8E923D44341F085f6041509aC
- Container adapter: 0x536add8f30f03b69f6fbf29d425a816a0dc50106
- Formal Circuit #1 Container: 0xb67E375c873E1F278A52E215300B42831eDDC641
- Formal Circuit #1 Pod Account: 0xb4cAE1414c31158fCEDE3A2ad01F1C176e7809C0
- Manifest: public/manifests/circuit-1-v1.0.1.json
- Manifest publication tx: `0x3a24f133e3d82d61f641b5664cfde95ef886561066d4931b1d4d8e6b5042e618`
- DeWeb Manifest switch tx: `0x811875275a3b4aed72753547047c0f36af900959e4c2b70ca5bd1e01ea3a69e7`
- Real paid `UsageReceipt #1` tx: `0xec0ea8d18b23af9cb50d04c2b8263b11605262333c805d6e0b9e828f9ffbbbed`
- Pod withdrawal tx: `0x7b1ef24128c6e52dd67bc9c8a8dc32cddbe05a4c38b01b6facd8b555d6ff3d46`
- Processor withdrawal tx: `0x024bd01ae22d998a57e4876b3ed35fedaf641a0ad6886dadd434a2d4fbd70688`

For the field-by-field submission sheet, including the Processor creation transaction, factory target, transistor economics and the remaining evidence boundary, see [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md).

### Proof boundary

The discarded `1111 / 2222` deployment remains documented only as test history. The formal deployment includes Registry, Router, Factory, the official Container and Pod Account. A formal Manifest, DeWeb release, paid `UsageReceipt` and real withdrawals are recorded above. Ownership handoff remains an optional post-submission lifecycle demonstration and is not claimed as completed evidence.

### Competition requirements

The processor and Circuit evidence are linked above, the application scenario is demonstrated by the live Pod Controller, and the repository contains the contract addresses, deployment configuration, product demo, Manifest, tests and verification commands. The live paid-call and withdrawal evidence is recorded above. No value, volume or self-trade claim is used as a substitute for product evidence.
