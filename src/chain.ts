import { createPublicClient, decodeFunctionResult, encodeFunctionData, formatEther, http, keccak256, parseAbiItem, parseEther, stringToHex } from 'viem'

export const XLAYER_CHAIN_ID = 196
export const XLAYER_HEX_CHAIN_ID = '0xc4'
export const XLAYER_EXPLORER = 'https://www.oklink.com/xlayer'
export const XLAYER_RPC = import.meta.env.VITE_XLAYER_RPC_URL || 'https://rpc.xlayer.tech'

export const routerAddress = import.meta.env.VITE_ROUTER_ADDRESS || ''
export const registryAddress = import.meta.env.VITE_REGISTRY_ADDRESS || ''
export const tapeoutProcessorAddress = import.meta.env.VITE_TAPEOUT_PROCESSOR_ADDRESS || ''
export const revenueVaultAddress = import.meta.env.VITE_REVENUE_VAULT_ADDRESS || ''
export const ownershipAdapterAddress = import.meta.env.VITE_TAPEOUT_OWNERSHIP_ADAPTER_ADDRESS || ''
export const routerDeploymentBlock = BigInt(import.meta.env.VITE_ROUTER_DEPLOYMENT_BLOCK || '0')
export const registryDeploymentBlock = BigInt(import.meta.env.VITE_REGISTRY_DEPLOYMENT_BLOCK || '0')
export const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/'
export const liveCallsEnabled = import.meta.env.VITE_ENABLE_LIVE_CALLS === 'true'

const publicClient = createPublicClient({ transport: http(XLAYER_RPC) })
const usageReceiptEvent = parseAbiItem('event UsageReceipt(uint256 indexed receiptId, uint256 indexed circuitId, address indexed caller, bytes32 inputHash, bytes32 outputHash, uint256 amount, address creator, address processorRecipient, address commonsRecipient)')
const manifestPublishedEvent = parseAbiItem('event ManifestPublished(uint256 indexed circuitId, address indexed publisher, bytes32 indexed hash, uint256 price, uint16 creatorBps, uint16 processorBps, string manifestURI)')
const manifestViewAbi = [{ type: 'function', name: 'manifests', stateMutability: 'view', inputs: [{ name: 'circuitId', type: 'uint256' }], outputs: [{ name: 'publisher', type: 'address' }, { name: 'hash', type: 'bytes32' }, { name: 'price', type: 'uint256' }, { name: 'creatorBps', type: 'uint16' }, { name: 'processorBps', type: 'uint16' }, { name: 'revenueRecipient', type: 'address' }, { name: 'manifestURI', type: 'string' }, { name: 'active', type: 'bool' }] }] as const

export const routerAbi = [
  {
    type: 'function', name: 'runEval', stateMutability: 'payable',
    inputs: [{ name: 'circuitId', type: 'uint256' }, { name: 'inputs', type: 'bytes' }], outputs: [{ name: 'receiptId', type: 'uint256' }]
  }
] as const

export const registryAbi = [
  {
    type: 'function', name: 'publish', stateMutability: 'nonpayable',
    inputs: [{ name: 'circuitId', type: 'uint256' }, { name: 'manifestHash', type: 'bytes32' }, { name: 'manifestURI', type: 'string' }, { name: 'price', type: 'uint256' }, { name: 'creatorBps', type: 'uint16' }, { name: 'processorBps', type: 'uint16' }], outputs: []
  }
  ,{
    type: 'function', name: 'setRevenueRecipient', stateMutability: 'nonpayable',
    inputs: [{ name: 'circuitId', type: 'uint256' }, { name: 'recipient', type: 'address' }], outputs: []
  }
] as const

export const revenueVaultAbi = [
  {
    type: 'function', name: 'deposit', stateMutability: 'payable',
    inputs: [], outputs: []
  },
  {
    type: 'function', name: 'claimYield', stateMutability: 'nonpayable',
    inputs: [], outputs: []
  },
  {
    type: 'function', name: 'redeemPT', stateMutability: 'nonpayable',
    inputs: [], outputs: []
  },
  {
    type: 'function', name: 'ptBalanceOf', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function', name: 'ytBalanceOf', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function', name: 'pendingYield', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }]
  }
] as const

export const shortAddress = (address: string) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not configured'

export async function connectWallet() {
  if (!window.ethereum) throw new Error('No EVM wallet detected. Install a wallet extension to continue.')
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
  const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string
  return { address: accounts[0], chainId: Number.parseInt(chainId, 16) }
}

export async function switchToXLayer() {
  if (!window.ethereum) throw new Error('No EVM wallet detected.')
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: XLAYER_HEX_CHAIN_ID }] })
  } catch (error) {
    const code = (error as { code?: number }).code
    if (code !== 4902) throw error
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{ chainId: XLAYER_HEX_CHAIN_ID, chainName: 'X Layer', nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 }, rpcUrls: [XLAYER_RPC], blockExplorerUrls: [XLAYER_EXPLORER] }]
    })
  }
}

export async function runCircuit(circuitId: bigint, inputHex: `0x${string}`, price: string) {
  if (!window.ethereum) throw new Error('Connect an EVM wallet first.')
  if (!routerAddress) throw new Error('Router contract is not configured. Add VITE_ROUTER_ADDRESS to .env.local.')
  const data = encodeFunctionData({ abi: routerAbi, functionName: 'runEval', args: [circuitId, inputHex] })
  return await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ to: routerAddress, data, value: parseEther(price).toString(16) }] }) as string
}

export async function depositToVault(amount: string) {
  if (!window.ethereum) throw new Error('Connect an EVM wallet first.')
  if (!revenueVaultAddress) throw new Error('Revenue Vault is not configured. Add VITE_REVENUE_VAULT_ADDRESS to .env.local.')
  const data = encodeFunctionData({ abi: revenueVaultAbi, functionName: 'deposit' })
  return await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ to: revenueVaultAddress, data, value: parseEther(amount).toString(16) }] }) as string
}

export async function callVaultAction(action: 'claimYield' | 'redeemPT') {
  if (!window.ethereum) throw new Error('Connect an EVM wallet first.')
  if (!revenueVaultAddress) throw new Error('Revenue Vault is not configured. Add VITE_REVENUE_VAULT_ADDRESS to .env.local.')
  const data = encodeFunctionData({ abi: revenueVaultAbi, functionName: action })
  return await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ to: revenueVaultAddress, data, value: '0x0' }] }) as string
}

export async function readVaultPosition(account: string) {
  if (!window.ethereum || !revenueVaultAddress) return null
  const read = async (functionName: 'ptBalanceOf' | 'ytBalanceOf' | 'pendingYield') => {
    const data = encodeFunctionData({ abi: revenueVaultAbi, functionName, args: [account as `0x${string}`] })
    const result = await window.ethereum!.request({ method: 'eth_call', params: [{ to: revenueVaultAddress, data }, 'latest'] }) as `0x${string}`
    return decodeFunctionResult({ abi: revenueVaultAbi, functionName, data: result }) as bigint
  }
  const [pt, yt, claimable] = await Promise.all([read('ptBalanceOf'), read('ytBalanceOf'), read('pendingYield')])
  if (pt === 0n && yt === 0n && claimable === 0n) return null
  return { vault: 'Configured Revenue Vault', pt: formatEther(pt), yt: formatEther(yt), claimable: formatEther(claimable), status: 'active' as const }
}

export interface CircuitLicenseInput {
  circuitId: string
  name: string
  version: string
  inputSchema: string
  outputSchema: string
  manifestURI: string
  price: string
  creatorBps: number
  processorBps: number
}

export function buildManifestJson(input: CircuitLicenseInput) {
  return JSON.stringify({ chainId: XLAYER_CHAIN_ID, circuitId: input.circuitId, name: input.name.trim(), version: input.version.trim(), processor: tapeoutProcessorAddress, inputSchema: input.inputSchema.trim(), outputSchema: input.outputSchema.trim(), price: input.price, creatorBps: input.creatorBps, processorBps: input.processorBps, commonsBps: 10000 - input.creatorBps - input.processorBps }, null, 2)
}

export async function publishCircuit(input: CircuitLicenseInput, account: string) {
  if (!window.ethereum) throw new Error('Connect an EVM wallet first.')
  if (!registryAddress || !ownershipAdapterAddress) throw new Error('Registry or TapeOut ownership adapter is not configured.')
  const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string
  if (Number.parseInt(chainId, 16) !== XLAYER_CHAIN_ID) throw new Error('Switch your wallet to X Layer first.')
  const id = BigInt(input.circuitId)
  const ownerData = encodeFunctionData({ abi: [{ type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'circuitId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] }] as const, functionName: 'ownerOf', args: [id] })
  const ownerResult = await window.ethereum.request({ method: 'eth_call', params: [{ to: ownershipAdapterAddress, data: ownerData }, 'latest'] }) as `0x${string}`
  const owner = decodeFunctionResult({ abi: [{ type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'circuitId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] }] as const, functionName: 'ownerOf', data: ownerResult })
  if (owner.toLowerCase() !== account.toLowerCase()) throw new Error('Connected wallet does not own this TapeOut circuit.')

  const manifestJson = buildManifestJson(input)
  const manifestHash = keccak256(stringToHex(manifestJson))
  const data = encodeFunctionData({ abi: registryAbi, functionName: 'publish', args: [id, manifestHash, input.manifestURI.trim(), parseEther(input.price), input.creatorBps, input.processorBps] })
  const txHash = await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ from: account, to: registryAddress, data, value: '0x0' }] }) as string
  return { txHash, manifestJson, manifestHash }
}

export async function readPublishedCircuits() {
  if (!registryAddress) return []
  const latest = await publicClient.getBlockNumber()
  const fromBlock = latest - registryDeploymentBlock > 10000n ? latest - 10000n : registryDeploymentBlock
  if (fromBlock > latest) return []
  const logs = await publicClient.getLogs({ address: registryAddress as `0x${string}`, event: manifestPublishedEvent, fromBlock, toBlock: latest })
  const latestByCircuit = new Map<string, (typeof logs)[number]>()
  for (const log of logs) latestByCircuit.set(log.args.circuitId!.toString(), log)
  const items = await Promise.all([...latestByCircuit.values()].reverse().map(async (log) => {
    const current = await publicClient.readContract({ address: registryAddress as `0x${string}`, abi: manifestViewAbi, functionName: 'manifests', args: [log.args.circuitId!] })
    if (!current[7] || current[1] !== log.args.hash || current[6] !== log.args.manifestURI) return null
    const uri = log.args.manifestURI!
    const url = uri.startsWith('ipfs://') ? `${ipfsGateway.replace(/\/$/, '')}/${uri.slice(7)}` : uri
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Manifest fetch failed (${response.status})`)
    const raw = await response.text()
    if (keccak256(stringToHex(raw)) !== log.args.hash) throw new Error(`Manifest hash mismatch for Circuit #${log.args.circuitId}`)
    const manifest = JSON.parse(raw) as { circuitId: string; name: string; description?: string; version: string; processor: string; inputSchema: string; outputSchema: string; price: string }
    if (BigInt(manifest.circuitId) !== log.args.circuitId) throw new Error('Manifest Circuit ID does not match its Registry event.')
    const circuitId = log.args.circuitId!
    const creatorShare = Number(log.args.creatorBps) / 100
    const processorShare = Number(log.args.processorBps) / 100
    return { id: circuitId.toString(), name: manifest.name, description: manifest.description || 'Published TapeOut circuit.', circuitId, processor: manifest.processor, version: manifest.version, inputSchema: manifest.inputSchema, outputSchema: manifest.outputSchema, price: manifest.price, creator: log.args.publisher!, creatorShare, processorShare, commonsShare: 100 - creatorShare - processorShare, calls: 0, status: 'live' as const, accent: 'cyan', glyph: manifest.name.slice(0, 1).toUpperCase() }
  }))
  return items.filter((item): item is NonNullable<typeof item> => item !== null)
}

export async function readUsageReceipts() {
  if (!routerAddress) return []
  const latest = await publicClient.getBlockNumber()
  const fromBlock = latest - routerDeploymentBlock > 10000n ? latest - 10000n : routerDeploymentBlock
  if (fromBlock > latest) return []
  const logs = await publicClient.getLogs({ address: routerAddress as `0x${string}`, event: usageReceiptEvent, fromBlock, toBlock: latest })
  return Promise.all(logs.slice(-100).reverse().map(async (log) => {
    const block = await publicClient.getBlock({ blockNumber: log.blockNumber! })
    const circuitId = log.args.circuitId!
    return {
      id: `#${log.args.receiptId!.toString()}`,
      circuit: `Circuit #${circuitId.toString()}`,
      amount: `${formatEther(log.args.amount!)} OKB`,
      timestamp: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(Number(block.timestamp) * 1000),
      txHash: log.transactionHash!,
      state: 'confirmed' as const,
    }
  }))
}
