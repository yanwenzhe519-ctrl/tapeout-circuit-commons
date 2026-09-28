# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Vite + React + TypeScript for a portable frontend and a small, auditable contract integration layer.

## Users

Circuit creators who want to license TapeOut circuits, and X Layer application builders who need deterministic on-chain computation with clear OKB pricing and revenue splits.

## Product Purpose

TapeOut Circuit Commons is the operating layer for Circuit Pods: transferable on-chain application units built around a real TapeOut Circuit, its official Container, a service surface, and X Layer assets. It helps a creator package a Circuit into a verifiable Pod, inspect the asset and contract bindings, operate its X Layer revenue, and hand the whole unit to a new owner without migrating the application. Registry, manifests, receipts, and settlement rails remain supporting primitives; the user-facing outcome is a durable, operable, transferable on-chain app.

## Positioning

The product is the handoff and operations layer between TapeOut ownership and X Layer applications: Pod creation, Container binding, service-surface metadata, asset inspection, ownership handoff, and auditable operating history. It does not replace the TapeOut canvas, circuit verifier, asset market or DeWeb gateway; it makes a Circuit useful as a complete application unit that can be operated, funded, and transferred. Risk management is not the product category.

## Operating Context

Users connect an EVM wallet, select X Layer (chain ID 196), browse circuit manifests, inspect Processor/Circuit metadata, authorize an OKB call, and follow the resulting transaction in an explorer. Creators can publish a manifest and choose fixed payout shares. Integrators use the generated SDK configuration and receipt data.

## Capabilities and Constraints

- X Layer is the first target network and OKB is the payment asset.
- TapeOut Processor and Circuit identifiers, input/output schemas, versions, netlist hashes, Container address and control relationship are shown as verifiable metadata.
- The Pod Account is a stable X Layer contract whose controller is derived from TapeOut's canonical `ownerOf(circuitId)`; transferring the Circuit changes control without moving the account, assets, revenue or receipts.
- Processor revenue is credited to an explicit, withdrawable settlement recipient rather than to the Processor contract itself, so the payout path is operable on real deployments.
- The app must support real wallet connection, chain switching, and contract calls when addresses are configured.
- Missing deployment addresses or RPC data must be visible as configuration state, never presented as completed on-chain facts.
- Public TapeOut data is read through a same-origin proxy because the upstream API does not grant browser CORS access; proxy failure must surface as unavailable, never as cached or invented values.
- No new fungible protocol token is required for the MVP.
- Pod handoffs must be versioned, nonce-protected, bound to the current Circuit owner, and compatible with an auditable asset and revenue surface.

## Evidence on Hand

TapeOut.link lists the existing canvas, market, verifier, DeWeb, game, and on-chain intelligence products. It does not list a dedicated Circuit licensing and usage-revenue router. The local production configuration now pins the verified X Layer RuleChip Processor/Circuit and official Container opener; Circuit Commons Registry, Router, and Vault remain blank until the team deploys the current Solidity set from its own wallet.

## Product Principles

- A Circuit becomes useful when it can carry an application, assets, and operating history.
- Every Pod handoff and paid execution must have a readable receipt.
- On-chain truth beats dashboard claims.
- Small, explicit contracts are safer than broad protocol abstractions.
- The happy path should fit in one screen; advanced metadata stays inspectable.

## Accessibility & Inclusion

Keyboard navigation, visible focus states, readable contrast, non-color status labels, and responsive layouts are required for the web interface.
