# TapeOut Circuit Commons

Circuit Commons is an X Layer-first application layer for TapeOut circuits. Circuit creators publish a versioned license manifest; applications pay in OKB to run an authorized circuit; the router emits a usage receipt and distributes the call fee according to the manifest split. The DeFi layer adds fixed-term Revenue Vaults that issue principal (PT) and variable usage-yield (YT) claims backed only by creator revenue credited by the Router.

## What is real in this repository

- A Vite + React + TypeScript application with real EIP-1193 wallet connection.
- X Layer chain switching (chain ID `196`) and OKLink links.
- `viem` ABI encoding for the Router call.
- A Registry-event Circuit catalog with content hash verification, plus creator publish and on-chain receipt views.
- Yield Vault and My Positions views with explicit PT/YT risk language and fail-closed transaction states.
- Solidity Registry, Router, and Revenue Vault contracts with manifest validation, price checks, owner binding, pull-payment splits, receipt events, fixed-term principal redemption, and usage-yield accounting.

## Configuration

Copy `.env.example` to `.env.local` and provide deployed X Layer addresses:

```text
VITE_XLAYER_RPC_URL=https://rpc.xlayer.tech
VITE_REGISTRY_ADDRESS=0x...
VITE_ROUTER_ADDRESS=0x...
VITE_TAPEOUT_PROCESSOR_ADDRESS=0x...
VITE_REVENUE_VAULT_ADDRESS=0x...
VITE_TAPEOUT_OWNERSHIP_ADAPTER_ADDRESS=0x...
VITE_ROUTER_DEPLOYMENT_BLOCK=0
VITE_REGISTRY_DEPLOYMENT_BLOCK=0
VITE_IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
VITE_ENABLE_LIVE_CALLS=false
```

Until those addresses are set, the site deliberately keeps execution disabled and labels the deployment as pending. Live circuit calls also require `VITE_ENABLE_LIVE_CALLS=true`, and must remain false until the TapeOut adapter ABI and input encoding have been manually verified. The ownership adapter must expose TapeOut's canonical `ownerOf(uint256)`. Set separate Registry and Router deployment blocks; event readers scan no more than the latest 10,000 blocks.

## Local development

```bash
npm install
npm run dev
```

Open the printed local URL, connect an EVM wallet, and switch to X Layer. Before deployment the catalog shows non-callable preview rows; the receipt view shows no fabricated transactions.

## Production verification

After creating `.env.local` from `.env.example`, run:

```bash
npm run verify:deployment
```

The verifier checks the RPC chain ID, bytecode at Registry/Router/Processor/ownership adapter addresses, and the configured Circuit manifest. It exits non-zero if a required address is missing, malformed, points to an EOA, or the manifest is incomplete. A Vault address is optional until the DeFi pool is created. Keep `VITE_ENABLE_LIVE_CALLS=false` until the actual TapeOut Processor ABI and byte encoding have been manually exercised on X Layer; then set it to `true`, rebuild, and run the verifier again.

For a public web deployment, import the repository into Vercel. The included `vercel.json` builds `dist/`. Set the same `VITE_*` variables in the hosting provider's production environment; never commit `.env.local` or a private deployment key.

The public launch checklist is: deploy and verify Processor through TapeOut factory; record the deployment wallet and Processor transaction; deploy the current Registry/Router versions; publish a real Manifest URI; deploy and configure the Vault; run one paid Circuit call; verify the UsageReceipt and creator withdrawal; then publish the product URL and GitHub URL in the hackathon form.

## Contract deployment order

The Registry and Router ABI in this working tree changed during development to include manifest URIs. Any earlier deployment of these contracts is incompatible; deploy the current versions as a fresh set before configuring the app.

1. Deploy the verified TapeOut Processor or a small adapter that exposes the exact `eval(uint256,bytes)` ABI used by the Router.
2. Deploy a TapeOut ownership adapter exposing `ownerOf(uint256)` for the target Circuit NFT.
3. Deploy `CircuitCommonsRegistry(ownershipAdapter)` on X Layer.
4. Deploy `CircuitCommonsRouter(registry, processor, commonsRecipient)`.
5. Complete the Publish form, export the canonical JSON, upload that unchanged file to IPFS (or immutable HTTPS storage), paste its URI, then publish from the Circuit owner account. The page verifies ownership through the adapter and writes the JSON keccak256, URI, price and split to the Registry. Catalog readers fetch the URI and reject any content whose hash no longer matches.
6. Deploy `CircuitRevenueVault(router, circuitId, manifestHash, maturity, cap)` using that hash.
7. Call `setRevenueRecipient(circuitId, vault)` from the Circuit owner account. To republish a Circuit manifest, first set the existing revenue recipient to the zero address; this prevents old Vaults from silently receiving revenue for a new version.
8. Put the resulting addresses and Router deployment block in `.env.local`, then rebuild and verify on X Layer.

## DeFi accounting model

The Vault is not a fixed-rate product. It mints internal PT and YT balances 1:1 against deposited OKB, but YT only accrues when the Router credits the Vault as the manifest's `revenueRecipient`. The Vault pulls its creator share through `Router.withdraw()`, indexes it across YT balances, and lets users claim realized revenue. If there are no YT holders, the withdrawal reverts and Router funds remain pending rather than being stranded in the Vault. PT is redeemable after maturity if liquidity is available. PT/YT are not ERC-20 tokens in this version and are not composable with external DeFi protocols. Until a deployment is configured, catalog and vault examples remain clearly labeled fixtures and receipt history is empty rather than fabricated.

## Contract tests

With Foundry installed, run:

```bash
forge test
```

The tests cover owner-only publishing, exact-price execution, inactive Circuit rejection, payout conservation, recipient/version changes, Router withdrawal preservation before the first deposit, cap enforcement, maturity, PT redemption, and YT transfer accrual. They are regression tests, not an audit.

The TapeOut Processor ABI must be checked against the target deployment before production deployment. The Router intentionally fails closed when a circuit is inactive or the call price is wrong.

## Security notes

The contracts use immutable registry/router references, exact-price checks, bounded payout shares, pull-payment escrow, reentrancy locks, circuit-owner verification through an explicit adapter, and no protocol token. This repository is not ready to custody public funds until the TapeOut Processor ABI and ownership adapter are verified, all contracts are tested against those deployments on X Layer, PT/YT composability is decided, and an independent security review is complete. Do not market PT/YT as guaranteed yield.
