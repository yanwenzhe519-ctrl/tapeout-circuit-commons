export type CircuitStatus = 'live' | 'draft' | 'paused'

export interface CircuitManifest {
  id: string
  name: string
  description: string
  circuitId: bigint
  processor: string
  version: string
  inputSchema: string
  outputSchema: string
  price: string
  creator: string
  creatorShare: number
  processorShare: number
  commonsShare: number
  calls: number
  status: CircuitStatus
  accent: string
  glyph: string
}

export interface UsageReceipt {
  id: string
  circuit: string
  amount: string
  timestamp: string
  txHash: string
  state: 'confirmed' | 'pending'
}

export type VaultStatus = 'live' | 'pending' | 'matured' | 'paused'

export interface YieldVault {
  id: string
  circuit: string
  circuitId: bigint
  manifestVersion: string
  description: string
  maturity: string
  daysLeft: number
  tvl: string
  cap: string
  realized30d: string
  realized7d: string
  calls30d: number
  ptPrice: string
  ytShare: number
  status: VaultStatus
  vaultAddress: string
  accent: string
}

export interface Position {
  vault: string
  pt: string
  yt: string
  claimable: string
  status: 'active' | 'awaiting-wallet'
}
