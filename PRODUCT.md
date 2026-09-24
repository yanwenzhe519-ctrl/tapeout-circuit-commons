# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Vite + React + TypeScript for a portable frontend and a small, auditable contract integration layer.

## Users

Circuit creators who want to license TapeOut circuits, and X Layer application builders who need deterministic on-chain computation with clear OKB pricing and revenue splits.

## Product Purpose

TapeOut Circuit Commons is a usable registry and payment router for TapeOut circuits. It lets a circuit owner publish a versioned license manifest, lets an application pay in OKB to execute an authorized circuit on X Layer, and records a usage receipt plus the configured revenue split. Success means a new integrator can discover a circuit, connect a wallet, switch to X Layer, run a real call, and verify the receipt without touching the BLIF canvas.

## Positioning

The product owns the application layer between TapeOut circuit assets and X Layer applications: licensing, metered usage, receipts, and split payments. It does not replace the TapeOut canvas, circuit verifier, asset market, or DeWeb gateway.

## Operating Context

Users connect an EVM wallet, select X Layer (chain ID 196), browse circuit manifests, inspect Processor/Circuit metadata, authorize an OKB call, and follow the resulting transaction in an explorer. Creators can publish a manifest and choose fixed payout shares. Integrators use the generated SDK configuration and receipt data.

## Capabilities and Constraints

- X Layer is the first target network and OKB is the payment asset.
- TapeOut Processor and Circuit identifiers, input/output schemas, versions, and netlist hashes are shown as verifiable metadata.
- The app must support real wallet connection, chain switching, and contract calls when addresses are configured.
- Missing deployment addresses or RPC data must be visible as configuration state, never presented as completed on-chain facts.
- No new fungible protocol token is required for the MVP.
- License and usage receipts must be versioned, nonce-protected, and compatible with an auditable split-payment contract.

## Evidence on Hand

TapeOut.link lists the existing canvas, market, verifier, DeWeb, game, and on-chain intelligence products. It does not list a dedicated Circuit licensing and usage-revenue router. Official TapeOut and X Layer contract addresses for this product are not yet supplied and must remain environment configuration.

## Product Principles

- A Circuit is useful when another application can safely call it.
- Every paid execution must have a readable receipt.
- On-chain truth beats dashboard claims.
- Small, explicit contracts are safer than broad protocol abstractions.
- The happy path should fit in one screen; advanced metadata stays inspectable.

## Accessibility & Inclusion

Keyboard navigation, visible focus states, readable contrast, non-color status labels, and responsive layouts are required for the web interface.
