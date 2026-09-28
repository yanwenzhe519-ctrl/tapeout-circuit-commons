# Circuit Commons Demo Script

## 2–3 minute recording path

1. Open the public site and switch to Chinese. Say: “Circuit Commons turns a TapeOut Circuit into a transferable X Layer application account. We transfer the project, not just an NFT.”
2. On Overview, show the four-part rail: Circuit identity → Pod Account → OKB revenue → handoff. Point out that all displayed addresses are read from X Layer.
3. Click **运行真实 Circuit**. Open Circuit #1, keep input `0x00`, and explain the exact price (`0.0000001 OKB`) and the preflight simulation. Connect the wallet, switch to X Layer, and confirm the transaction.
4. The app automatically opens **链上活动** after confirmation. Show the UsageReceipt, transaction link, input hash, output hash, amount, and caller filtering.
5. Open **项目结算流程**. Show wallet and Pod pending revenue. If a balance is available, withdraw it; explain that Pod revenue remains controlled by the current Circuit owner through the same Pod Account.
6. Open **Circuit Pods**. Show Circuit #1, Container `0x25A1...0764`, Pod `0x5FeB...0eb6`, active Manifest, and the handoff verification desk.
7. Explain the handoff: lock the pre-transfer snapshot, transfer the Circuit through TapeOut, then verify that the Pod, Container, Manifest and revenue account did not change while the old owner lost control.

## Closing line

“TapeOut makes computation permanent. Circuit Commons makes the complete application—its address, assets, revenue, permissions and operating history—transferable on X Layer.”

## Before recording

Run `npm run verify:release`, keep a small OKB balance for the paid call and gas, and close unrelated wallet accounts/tabs. Do not reopen the Container; Circuit #1 is already open.
