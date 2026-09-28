# X Layer deployment checklist

## DeWeb website release

Build and open the owner-signed TapeKit publisher:

```bash
npm run build
npm run deweb:publisher
```

Use the Circuit #1 owner wallet on X Layer, select `dist`, review the file/chunk/Gas plan, and confirm the wallet prompts. The publisher targets Container `0x25A1D87789aE72E326B3A987F610F08219aA0764`, SiteRegistry `0xd6efb7adcc9c83dc4924ad56f6a8e4e969b9adb6`, DomainBinding `0x68809fd2fb343aa57d0aeb7f33defe477c9666f9`, and the X Layer name `1.2.177.tape`. It never asks for the owner private key.

This is the real launch path. Empty addresses are expected before the contracts are deployed; do not replace them with guessed values.

## 1. Install and prepare

This checklist is for the one-time protocol administrator deployment. It is not required by ordinary Circuit owners or end users. A smart-account or no-private-key wallet must sign each deployment transaction through its wallet UI; do not use `PRIVATE_KEY` for that account.

```bash
foundryup
forge install foundry-rs/forge-std --no-commit
copy .env.deploy.example .env.deploy
```

Fill `.env.deploy` with the verified TapeOut ownership adapter, Processor, Circuit ID, a withdrawable Processor recipient, and a separate protocol commons recipient. The commons recipient is only the fallback for circuits that have not created a Pod; once a Pod exists, its address receives the Pod share. Keep `PRIVATE_KEY` out of git; use a hardware wallet/account flow for production.

Before broadcasting, verify the deployer has OKB on X Layer and that both recipient addresses are externally owned and controlled by the intended operators. The deploy script rejects contract recipients because Router withdrawals are pull-based.

## 2. Generate deterministic inputs

```bash
npm run manifest:generate
npm run deployment:params
npm run contracts:build
npm run contracts:test
```

Upload `outputs/manifest.json` unchanged to immutable storage. Keep the printed keccak256 hash and URI.

## 3. Deploy

```bash
npm run contracts:deploy
```

Record the printed `CircuitPodAccount`, `CircuitCommonsRegistry`, `CircuitCommonsRouter`, and optional `CircuitRevenueVault` addresses. The deploy script does not publish a manifest or change the Registry recipient because those actions must be authorized by the current Circuit owner.

## 4. Configure the Circuit owner actions

Set the deployed addresses in `.env.local`, then use the owner wallet to:

1. Publish the exact Manifest URI, hash, price, and payout shares.
2. Set `REVENUE_RECIPIENT` to the intended Revenue Vault or Pod treasury.
3. Run `npm run contracts:configure` only when `.env.deploy` contains the current owner key and the correct Registry address.
4. Pay the official TapeOut Container `FEE()` and call `open(processor, circuitId)` from the Circuit owner wallet.

## 5. Verify before opening to users

```bash
npm run verify:xlayer
npm run build
```

The verifier must report X Layer chain ID `196`, live Processor Circuit ownership, matching Container account, Router processor recipient, and deployed shared Registry/Router/Factory bytecode. A per-Circuit Pod Account is created by the Factory and is not a global deployment prerequisite. It intentionally fails while any shared production address is blank.

## 6. Real smoke test

Use the connected owner/user wallet to make one paid `runEval` call with the verified input encoding. Confirm the transaction receipt, `UsageReceipt` event, creator/processor/Pod pending balances, and the corresponding X Layer explorer transaction before enabling `VITE_ENABLE_LIVE_CALLS=true`.
