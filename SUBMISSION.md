# Hackathon Submission Draft

Use this draft for the TapeOut Genesis Transistor Hackathon form after the real Processor deployment and first Circuit tapeout are complete.

## Project Name

TapeOut Circuit Commons

## Project Description

TapeOut Circuit Commons is an X Layer application layer for turning TapeOut circuits into licensed, metered services. Circuit owners publish a versioned Manifest with an immutable content hash, public URI, OKB price, and payout split. X Layer applications call a verified Processor through our Router, and every paid execution emits a UsageReceipt containing the Circuit ID, caller, input commitment, output commitment, amount, and payout recipients.

The DeFi layer addresses a missing primitive in the TapeOut ecosystem: predictable rights around circuit usage revenue. A creator can route its share into a fixed-term Revenue Vault. Depositors receive principal claims (PT) and variable usage-revenue claims (YT). YT can only claim realized creator revenue from verified Router withdrawals; there is no fixed APY and no protocol token. PT redemption is time-locked, payout accounting is pull-based, and the Vault is bound to the exact Manifest hash.

The product includes a public circuit catalog, owner-verified publishing flow, hash-checked Manifest discovery, wallet connection, X Layer network switching, signed OKB calls, on-chain receipt history, Revenue Vault deposits, and PT/YT positions. The UI stays fail-closed until the deployed TapeOut Processor ABI, ownership adapter, and real X Layer addresses are configured.

## Public Links

- GitHub: https://github.com/yanwenzhe519-ctrl/tapeout-circuit-commons
- Demo: https://yanwenzhe519-ctrl.github.io/tapeout-circuit-commons/
- Processor contract: `[PROCESSOR_ADDRESS]`
- Deployment wallet: `[DEPLOYMENT_WALLET]`
- First Circuit tapeout transaction: `[TAPEOUT_TRANSACTION]`
- Product demo transaction / UsageReceipt: `[USAGE_RECEIPT_TRANSACTION]`

## Contact

- X: `[X_ACCOUNT]`
- Telegram: `[TELEGRAM_USERNAME]`
- Contact email: `[CONTACT_EMAIL]`

## Eligibility Evidence Checklist

- [ ] Processor deployed on X Layer through TapeOut factory
- [ ] Transistor supply, unit price, and cap publicly disclosed at deployment
- [ ] At least one Circuit taped out on the Processor before the deadline
- [ ] Processor address and deployment wallet added above
- [ ] Public Demo URL loads without wallet configuration and shows the fail-closed state
- [ ] Real X Layer addresses added to the hosting provider environment
- [ ] `npm run verify:deployment` passes
- [ ] `VITE_ENABLE_LIVE_CALLS=true` enabled only after Processor ABI verification
- [ ] At least one real paid call produces a UsageReceipt
