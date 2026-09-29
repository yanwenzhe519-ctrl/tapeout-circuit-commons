# Submission Checklist

This sheet uses the formal `Circuit Commons / CCOM` Processor and its verified X Layer deployment. Remaining end-to-end proof items are listed in section 6.

## 1. Processor and TapeOut factory

| Required field | Submission value | Evidence / status |
| --- | --- | --- |
| Formal Processor | `0xC658d4FCe1bD1b2E36e9d2c36832E933abe9189F` | Formal Processor shown in the TapeOut page; `factory()` returns `0x1f09DAeFA827f02CBb40967cc91b259763760761`. |
| Processor name / symbol | `Circuit Commons` / `CCOM` | Read from the formal Processor contract. |
| Processor Circuit | Circuit `#1` | `ownerOf(1)` is live; owner is `0x05667de34ad47bafe8a8b976c19809cadf7719d2`. |
| Processor deployment wallet | `0x05667de34ad47bafe8a8b976c19809cadf7719d2` | Creator shown by the TapeOut page. |
| Processor deployment transaction | `0xbd3029889c4946eb6e79bdd2c13c5f9c4d4e6f0a17cca8cca0c138c3d8d32e1c` | Verified TapeOut factory `CPUCreated` transaction, block `71743588`. |
| TapeOut factory | `0x1f09DAeFA827f02CBb40967cc91b259763760761` | Returned by `factory()` on the formal Processor. |

## 2. Transistor economics

| Required field | Submission value | Evidence / status |
| --- | --- | --- |
| Total supply / upper limit | `1,000,000,000` transistors | Shown on the formal Processor page. |
| Current minted supply | `50` | Shown on the formal Processor page. |
| Unit mint price | `0.000066 OKB` per transistor | Shown on the formal Processor page. |
| Per-mint protocol fee | `0.00066 OKB` per mint transaction | Separate from the per-transistor price; shown on the formal Processor page. |
| Transistor contract | `0x70737D8fdc1f9c99Bf5cc356F4Fc154f72307370` | Indexed in the formal Processor's TapeOut factory creation event. |

## 3. Circuit proof

| Required field | Submission value | Evidence / status |
| --- | --- | --- |
| Circuit | `#1` on Processor `0xC658...9189F` | Live on X Layer; current owner is the submitting wallet. |
| At least one completed tapeout | `0xdb078cc16f0c4c7e909d43fa81cadb1609c2586efb01702b6a29ad87877bc396` | Verified `TapedOut` transaction, block `71746266`, Circuit `#1`, `47` gates. |
| Official Container | `0xb67E375c873E1F278A52E215300B42831eDDC641` | Verified `opened=true`, `deployed=true`; opened in transaction `0x9f77805defb518030b74482a0a8b67dd36d5c8519c4ee9145f8ca18186fe4eab`, block `71881734`. |
| Container adapter | `0x536add8f30f03b69f6fbf29d425a816a0dc50106` | Official X Layer adapter. |

## 4. X Layer application contracts

| Component | Formal deployment / evidence |
| --- | --- |
| Registry | `0x0A67B77e27004cc54A79207335179B7E6D29257D`, block `71885138` |
| Router | `0x8f1f0224c4B6e775a0c68E31fef374dAAD605D00`, block `71885144` |
| Pod Factory | `0x6262E61e955a9fa8E923D44341F085f6041509aC`, block `71885150` |
| Registry `setFactory` | `0xf49cf1c0608fe73860ae9c50db1c491d5f9bc008dda96b21e849e238cb694fef`, block `71885155` |
| Pod Account | `0xb4cAE1414c31158fCEDE3A2ad01F1C176e7809C0` |
| Pod creation | `0x3d2066eddd57c6a0792e17da2777b9af90aded616422f0858639783f6b0014cd`, block `71885553` |
| Pod service | `https://yanwenzhe519-ctrl.github.io/tapeout-circuit-commons/` |
| X Layer chain ID | `196` |

## 5. Product links

- Product demo: https://yanwenzhe519-ctrl.github.io/tapeout-circuit-commons/
- Formal DeWeb target: `tape://1.2.248.tape/` (activation pending)
- Formal DeWeb gateway: https://1-2-248.tapekit.org/
- GitHub: https://github.com/yanwenzhe519-ctrl/tapeout-circuit-commons
- Manifest: https://yanwenzhe519-ctrl.github.io/tapeout-circuit-commons/manifests/circuit-1-v1.0.1.json

## 6. Work required before claiming full completion

1. Publish the formal Manifest through the Registry and record its transaction hash.
2. Record one real paid Router call and its `UsageReceipt` transaction hash.
3. Record one real revenue withdrawal from the Pod flow.
4. Record one real Circuit ownership transfer and post-transfer handoff verification.
5. Activate the formal `1.2.248.tape` DeWeb release.
