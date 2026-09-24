import type { CircuitManifest, Position, YieldVault } from './types'

export const circuits: CircuitManifest[] = [
  {
    id: 'quorum-4', name: 'QUORUM-4', description: 'A fixed, replayable 2-of-4 approval primitive for X Layer applications.', circuitId: 1n,
    processor: 'Preview only', version: '1.0.0', inputSchema: 'approvals[4]: bool', outputSchema: 'approved: bool', price: '0.00010', creator: 'Preview only', creatorShare: 80, processorShare: 15, commonsShare: 5, calls: 0, status: 'draft', accent: 'cyan', glyph: 'Q'
  },
  {
    id: 'score-8', name: 'SCORE-8', description: 'Deterministic 8-bit scoring for grants, quests, and reputation workflows.', circuitId: 2n,
    processor: 'Preview only', version: '1.2.0', inputSchema: 'signals[8]: uint8', outputSchema: 'score: uint16', price: '0.00018', creator: 'Preview only', creatorShare: 75, processorShare: 20, commonsShare: 5, calls: 0, status: 'draft', accent: 'amber', glyph: 'S'
  },
  {
    id: 'pulse-1', name: 'PULSE-1', description: 'Stateful liveness pulse for long-running X Layer jobs and service sessions.', circuitId: 3n,
    processor: 'Preview only', version: '0.9.0', inputSchema: 'beat: bool', outputSchema: 'alive: bool', price: '0.00006', creator: 'Preview only', creatorShare: 70, processorShare: 25, commonsShare: 5, calls: 0, status: 'draft', accent: 'lime', glyph: 'P'
  }
]

// These rows are explicitly labeled as fixture data until an indexed X Layer
// deployment is configured. They model the production schema used by Vaults.
export const yieldVaults: YieldVault[] = [
  {
    id: 'quorum-4-90d', circuit: 'QUORUM-4', circuitId: 1n, manifestVersion: '1.0.0',
    description: '90-day creator revenue vault backed by verified Router receipts.', maturity: 'Dec 23, 2026', daysLeft: 88,
    tvl: '0.00', cap: '--', realized30d: '0.0000', realized7d: '0.0000', calls30d: 0,
    ptPrice: '--', ytShare: 80, status: 'pending', vaultAddress: '', accent: 'cyan'
  },
  {
    id: 'score-8-30d', circuit: 'SCORE-8', circuitId: 2n, manifestVersion: '1.2.0',
    description: '30-day vault for deterministic scoring calls used by X Layer apps.', maturity: 'Oct 25, 2026', daysLeft: 29,
    tvl: '0.00', cap: '--', realized30d: '0.0000', realized7d: '0.0000', calls30d: 0,
    ptPrice: '--', ytShare: 75, status: 'pending', vaultAddress: '', accent: 'amber'
  }
]

export const positions: Position[] = []
