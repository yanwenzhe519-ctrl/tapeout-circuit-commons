# X Layer deployment checklist

## DeWeb website release

Build and open the owner-signed TapeKit publisher:

```bash
npm run build
npm run deweb:publisher
```

Use the Circuit #1 owner wallet on X Layer, select `dist`, review the file/chunk/Gas plan, and confirm the wallet prompts. The publisher targets the formal Container `0xb67E375c873E1F278A52E215300B42831eDDC641`, SiteRegistry `0xd6efb7adcc9c83dc4924ad56f6a8e4e969b9adb6`, DomainBinding `0x68809fd2fb343aa57d0aeb7f33defe477c9666f9`, and the formal X Layer name `1.2.248.tape`. It never asks for the owner private key.

This is the real launch path. The old `1.2.177.tape` release belongs to the discarded test Processor and must not be presented as the formal product.

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

## 3. Formal deployment (completed)

```bash
npm run contracts:deploy
```

The formal X Layer deployment is recorded in `deployments/xlayer-mainnet.json`:

- Registry: `0x0A67B77e27004cc54A79207335179B7E6D29257D`
- Router: `0x8f1f0224c4B6e775a0c68E31fef374dAAD605D00`
- Factory: `0x6262E61e955a9fa8E923D44341F085f6041509aC`
- Pod Account: `0xb4cAE1414c31158fCEDE3A2ad01F1C176e7809C0`

Do not redeploy these contracts for the submission. Manifest publication remains a separate Circuit-owner transaction.

## 4. Configure the Circuit owner actions

For the formal release, configure the deployed addresses in the local `.env.local` (or in the GitHub Pages environment secrets). Use the owner wallet to:

1. Publish the exact Manifest URI, hash, price, and payout shares.
2. Confirm the stable Pod is the creator/commons revenue destination.
3. Do not run `contracts:configure` for the wallet-only deployment.
4. Do not pay the Container fee again: the official Container is already open and deployed.

## 5. Verify before opening to users

```bash
npm run verify:xlayer
npm run build
```

The verifier must report X Layer chain ID `196`, live Processor Circuit ownership, matching Container account, Router processor recipient, deployed Registry/Router/Factory bytecode and the stable Pod binding. Before Manifest publication, its only expected errors are `incomplete manifest` and `manifest is inactive`.

## 6. Real smoke test

After publishing the Manifest, use a connected user wallet to make one paid `runEval` call with the verified input encoding. Confirm the transaction receipt, `UsageReceipt` event, creator/processor/Pod pending balances, and the corresponding X Layer explorer transaction. `VITE_ENABLE_LIVE_CALLS=true` is already configured for the formal release.
