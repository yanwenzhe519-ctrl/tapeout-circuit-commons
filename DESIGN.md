# Circuit Commons Design System

## Visual World

Circuit Commons is an X Layer transfer depot: an operating desk where a TapeOut Circuit is checked in, attached to a Pod Account, settled in OKB, and handed to its next operator. The interface uses a warm paper ground, ink-black work surfaces, and signal colors for state changes.

## Palette

- Paper: `#f2eee6`
- Panel: `#fffdf8`
- Ink: `#1c2421`
- Signal coral: `#f05d48`
- Chain teal: `#087f7a`
- Settlement gold: `#d4ac4a`
- Hairline: `#d8d0c2`

## Composition

- The Overview first viewport proves the four-part mechanism: Circuit identity, Pod Account, X Layer settlement, and handoff.
- Operational pages use quiet paper panels and dense readable rows; the dark surface is reserved for manifests, code, and the primary mechanism.
- Transfer states are expressed through labels and signal colors, never color alone.
- The handoff rail is horizontally scrollable on narrow screens so node dimensions remain stable and text never collapses.

## Type

- IBM Plex Sans carries product copy and controls.
- DM Mono is reserved for addresses, statuses, chain identifiers, and measurements.
- Headings use weight and scale rather than decorative effects.

## Product Truth

The UI distinguishes verified TapeOut/X Layer state from the project's own pre-deployment state. Empty Registry, Router, or Vault addresses remain visible as pending configuration and never appear as live balances or receipts.
