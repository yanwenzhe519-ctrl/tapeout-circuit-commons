import { createPublicClient, decodeFunctionResult, encodeAbiParameters, encodeFunctionData, formatEther, getCreate2Address, http, keccak256, parseAbiItem, parseEther, stringToHex } from 'viem'
import registryBytecode from '../outputs/bytecode/CircuitCommonsRegistry.bytecode.json'
import routerBytecode from '../outputs/bytecode/CircuitCommonsRouter.bytecode.json'
import factoryBytecode from '../outputs/bytecode/CircuitPodFactory.bytecode.json'

export const XLAYER_CHAIN_ID = 196
export const XLAYER_HEX_CHAIN_ID = '0xc4'
export const XLAYER_EXPLORER = 'https://www.oklink.com/xlayer'
export const XLAYER_RPC = import.meta.env.VITE_XLAYER_RPC_URL || 'https://rpc.xlayer.tech'
// EIP-2470 Singleton Factory is deployed on X Layer. Calling it keeps the
// wallet transaction targeted at a contract, which is required by some MPC
// wallets that reject a bare contract-creation transaction.
const singletonFactoryAddress = '0xce0042B868300000d44A59004Da54A005ffdcf9f' as `0x${string}`
const storedAddress = (key: string) => typeof window !== 'undefined' ? window.localStorage.getItem(`circuit-commons:${key}`) || '' : ''

export let routerAddress = import.meta.env.VITE_ROUTER_ADDRESS || storedAddress('router')
export let factoryAddress = import.meta.env.VITE_FACTORY_ADDRESS || storedAddress('factory')
export let registryAddress = import.meta.env.VITE_REGISTRY_ADDRESS || storedAddress('registry')
export const tapeoutProcessorAddress = import.meta.env.VITE_TAPEOUT_PROCESSOR_ADDRESS || ''
export const revenueVaultAddress = import.meta.env.VITE_REVENUE_VAULT_ADDRESS || ''
export const ownershipAdapterAddress = import.meta.env.VITE_TAPEOUT_OWNERSHIP_ADAPTER_ADDRESS || ''
export const containerAdapterAddress = import.meta.env.VITE_TAPEOUT_CONTAINER_ADAPTER_ADDRESS || ''
export const tapeoutContainerAddress = import.meta.env.VITE_TAPEOUT_CONTAINER_ADDRESS || ''
export let processorRecipientAddress = import.meta.env.VITE_PROCESSOR_RECIPIENT_ADDRESS || storedAddress('processorRecipient')
export const podAccountAddress = import.meta.env.VITE_POD_ACCOUNT_ADDRESS || ''
export const routerDeploymentBlock = BigInt(import.meta.env.VITE_ROUTER_DEPLOYMENT_BLOCK || '0')
export const registryDeploymentBlock = BigInt(import.meta.env.VITE_REGISTRY_DEPLOYMENT_BLOCK || '0')
export const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/'
export const liveCallsEnabled = import.meta.env.VITE_ENABLE_LIVE_CALLS === 'true'
export const adminWalletAddress = import.meta.env.VITE_ADMIN_WALLET_ADDRESS || ''
export const browserDeploymentEnabled = import.meta.env.VITE_ENABLE_BROWSER_DEPLOY === 'true'

const publicClient = createPublicClient({ transport: http(XLAYER_RPC) })

export type BrowserDeploymentResult = { registry: string; router: string; factory: string; transactions: string[] }

type BytecodeArtifact = { bytecode?: `0x${string}` }
const bytecodeObject = (artifact: unknown) => {
  const object = (artifact as { bytecode?: { object?: string } }).bytecode?.object
  return (object || '') as `0x${string}`
}
const deploymentBytecode = {
  registry: bytecodeObject(registryBytecode),
  router: bytecodeObject(routerBytecode),
  factory: bytecodeObject(factoryBytecode),
}

export async function deployProtocolFromWallet(account: string, processorRecipient: string, commonsRecipient: string): Promise<BrowserDeploymentResult> {
  if (!window.ethereum) throw new Error('Connect an EVM wallet first.')
  if (!browserDeploymentEnabled) throw new Error('Browser deployment is disabled in this build.')
  if (!account) throw new Error('Connect the administrator wallet first.')
  if (!ownershipAdapterAddress || !tapeoutProcessorAddress || !containerAdapterAddress) throw new Error('TapeOut deployment addresses are incomplete.')
  const transactions: string[] = []
  if (!deploymentBytecode.registry || !deploymentBytecode.router || !deploymentBytecode.factory) throw new Error('Browser deployment is not packaged in this build yet. Export creation bytecode from the verified Foundry build before enabling it.')
  const provider = window.ethereum!
  const chainId = await provider.request({ method: 'eth_chainId' }) as string
  if (Number.parseInt(chainId, 16) !== XLAYER_CHAIN_ID) throw new Error('Switch your wallet to X Layer first.')

  type WalletTransaction = { from: string; to?: string; data: string; value: string; gas?: string }
  const sendWalletTransaction = async (tx: WalletTransaction, label: string) => {
    try {
      // OKX may reject an eth_sendTransaction request that leaves gas estimation
      // entirely to the extension. Estimate through the same injected provider,
      // then add a small buffer for the signing request.
      const { gas: _existingGas, ...estimateTx } = tx
      const estimated = await provider.request({ method: 'eth_estimateGas', params: [estimateTx] }) as string
      const estimate = BigInt(estimated)
      const gas = `0x${(estimate + estimate / 5n).toString(16)}`
      return await provider.request({ method: 'eth_sendTransaction', params: [{ ...tx, gas }] }) as string
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : ''
      const raw = error instanceof Error ? error.message : typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error)
      const detail = /signTransactionError/i.test(raw) ? 'OKX 钱包拒绝了交易签名，请确认钱包仍在 X Layer 且账户有足够 OKB。' : raw
      throw new Error(`${label}失败${code ? ` (${code})` : ''}: ${detail}`)
    }
  }

  const singletonDeployAbi = [{ type: 'function', name: 'deploy', stateMutability: 'nonpayable', inputs: [{ name: 'initCode', type: 'bytes' }, { name: 'salt', type: 'bytes32' }], outputs: [{ name: 'createdContract', type: 'address' }] }] as const
  const deploy = async (bytecode: string, args: `0x${string}`, label: string) => {
    const initCode = `${bytecode}${args.slice(2)}` as `0x${string}`
    const salt = keccak256(stringToHex(`circuit-commons:${account.toLowerCase()}:${label}`))
    const predicted = getCreate2Address({ from: singletonFactoryAddress, salt, bytecode: initCode })
    const existingCode = await publicClient.getCode({ address: predicted })
    if (existingCode && existingCode !== '0x') return predicted
    const data = encodeFunctionData({ abi: singletonDeployAbi, functionName: 'deploy', args: [initCode, salt] })
    const txHash = await sendWalletTransaction({ from: account, to: singletonFactoryAddress, data, value: '0x0' }, label)
    transactions.push(txHash)
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    if (receipt.status !== 'success') throw new Error(`${label}已发送但链上执行失败: ${txHash}`)
    const deployedCode = await publicClient.getCode({ address: predicted })
    if (!deployedCode || deployedCode === '0x') throw new Error(`${label}交易成功但未找到合约字节码: ${txHash}`)
    return predicted
  }
  const registry = await deploy(deploymentBytecode.registry, encodeAbiParameters([{ type: 'address' }, { type: 'address' }], [ownershipAdapterAddress as `0x${string}`, account as `0x${string}`]), 'Registry 部署')
  const router = await deploy(deploymentBytecode.router, encodeAbiParameters([{ type: 'address' }, { type: 'address' }, { type: 'address' }, { type: 'address' }], [registry, tapeoutProcessorAddress as `0x${string}`, processorRecipient as `0x${string}`, commonsRecipient as `0x${string}`]), 'Router 部署')
  const factory = await deploy(deploymentBytecode.factory, encodeAbiParameters([{ type: 'address' }, { type: 'address' }, { type: 'address' }, { type: 'address' }], [ownershipAdapterAddress as `0x${string}`, registry, containerAdapterAddress as `0x${string}`, tapeoutProcessorAddress as `0x${string}`]), 'Factory 部署')
  const registryConfigAbi = [{ type: 'function', name: 'factory', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] }, { type: 'function', name: 'setFactory', stateMutability: 'nonpayable', inputs: [{ name: 'factory_', type: 'address' }], outputs: [] }] as const
  const configuredFactory = await publicClient.readContract({ address: registry, abi: registryConfigAbi, functionName: 'factory' })
  if (configuredFactory !== '0x0000000000000000000000000000000000000000' && configuredFactory.toLowerCase() !== factory.toLowerCase()) throw new Error(`Registry 已绑定到其他 Factory: ${configuredFactory}`)
  if (configuredFactory === '0x0000000000000000000000000000000000000000') {
    const setFactoryData = encodeFunctionData({ abi: registryConfigAbi, functionName: 'setFactory', args: [factory] })
    try {
      const configureTx = await sendWalletTransaction({ from: account, to: registry, data: setFactoryData, value: '0x0' }, 'Registry.setFactory')
      transactions.push(configureTx)
      const configureReceipt = await publicClient.waitForTransactionReceipt({ hash: configureTx as `0x${string}` })
      if (configureReceipt.status !== 'success') throw new Error(`Registry configuration failed: ${configureTx}`)
    } catch (error) {
      // OKX can return -32603 after broadcasting. Read the canonical state
      // before treating that response as a failed configuration.
      const afterError = await publicClient.readContract({ address: registry, abi: registryConfigAbi, functionName: 'factory' }).catch(() => '')
      if (afterError.toLowerCase() !== factory.toLowerCase()) throw error
    }
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('circuit-commons:registry', registry)
    window.localStorage.setItem('circuit-commons:router', router)
    window.localStorage.setItem('circuit-commons:factory', factory)
    window.localStorage.setItem('circuit-commons:processorRecipient', processorRecipient)
  }
  registryAddress = registry
  routerAddress = router
  factoryAddress = factory
  processorRecipientAddress = processorRecipient
  return { registry, router, factory, transactions }
}


export type DeploymentCheck = { key: string; label: string; configured: boolean; onChain: boolean; detail: string }

export async function readDeploymentChecks(): Promise<DeploymentCheck[]> {
  const checks: DeploymentCheck[] = []
  const contracts = [
    ['podAccount', 'Pod Account', podAccountAddress],
    ['registry', 'Registry', registryAddress],
    ['router', 'Router', routerAddress],
    ['factory', 'Pod Factory', factoryAddress],
    ['processorRecipient', 'Processor recipient', processorRecipientAddress],
  ] as const
  for (const [key, label, address] of contracts) {
    if (!address) {
      checks.push({ key, label, configured: false, onChain: false, detail: 'Missing VITE address' })
      continue
    }
    try {
      const code = await publicClient.getCode({ address: address as `0x${string}` })
      const onChain = Boolean(code && code !== '0x')
      checks.push({ key, label, configured: true, onChain, detail: onChain ? 'Contract bytecode found' : 'No bytecode at address' })
    } catch (error) {
      checks.push({ key, label, configured: true, onChain: false, detail: error instanceof Error ? error.message : 'RPC read failed' })
    }
  }
  return checks
}
const usageReceiptEvent = parseAbiItem('event UsageReceipt(uint256 indexed receiptId, uint256 indexed circuitId, address indexed caller, bytes32 inputHash, bytes32 outputHash, uint256 amount, address creator, address processorRecipient, address commonsRecipient)')
const manifestPublishedEvent = parseAbiItem('event ManifestPublished(uint256 indexed circuitId, address indexed publisher, bytes32 indexed hash, uint256 price, uint16 creatorBps, uint16 processorBps, string manifestURI)')
const manifestViewAbi = [{ type: 'function', name: 'manifests', stateMutability: 'view', inputs: [{ name: 'circuitId', type: 'uint256' }], outputs: [{ name: 'publisher', type: 'address' }, { name: 'hash', type: 'bytes32' }, { name: 'price', type: 'uint256' }, { name: 'creatorBps', type: 'uint16' }, { name: 'processorBps', type: 'uint16' }, { name: 'revenueRecipient', type: 'address' }, { name: 'manifestURI', type: 'string' }, { name: 'active', type: 'bool' }] }] as const

export const routerAbi = [
  {
    type: 'function', name: 'runEval', stateMutability: 'payable',
    inputs: [{ name: 'circuitId', type: 'uint256' }, { name: 'inputs', type: 'bytes' }], outputs: [{ name: 'receiptId', type: 'uint256' }]
  }
] as const

export const factoryAbi = [
  { type: 'function', name: 'createPod', stateMutability: 'nonpayable', inputs: [{ name: 'circuitId', type: 'uint256' }, { name: 'serviceHash', type: 'bytes32' }, { name: 'serviceURI', type: 'string' }], outputs: [{ name: 'pod', type: 'address' }] },
  { type: 'function', name: 'podOf', stateMutability: 'view', inputs: [{ name: 'circuitId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
] as const

const ownershipAbi = [{ type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'circuitId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] }] as const

export async function readCircuitOwner(circuitId: bigint) {
  if (!ownershipAdapterAddress || circuitId <= 0n) return ''
  try {
    return await publicClient.readContract({ address: ownershipAdapterAddress as `0x${string}`, abi: ownershipAbi, functionName: 'ownerOf', args: [circuitId] })
  } catch {
    return ''
  }
}

export async function readFactoryPod(circuitId: bigint) {
  if (!factoryAddress || circuitId <= 0n) return ''
  try {
    const pod = await publicClient.readContract({ address: factoryAddress as `0x${string}`, abi: factoryAbi, functionName: 'podOf', args: [circuitId] })
    return pod === '0x0000000000000000000000000000000000000000' ? '' : pod
  } catch {
    return ''
  }
}

export async function createPodOnChain(account: string, circuitId: bigint, serviceHash: `0x${string}`, serviceURI: string) {
  if (!window.ethereum) throw new Error('Connect an EVM wallet first.')
  if (!factoryAddress) throw new Error('Pod Factory is not configured. Add VITE_FACTORY_ADDRESS to .env.local.')
  if (!account) throw new Error('Connect the Circuit owner wallet first.')
  if (!serviceURI.trim()) throw new Error('Service URI is required.')
  const data = encodeFunctionData({ abi: factoryAbi, functionName: 'createPod', args: [circuitId, serviceHash, serviceURI.trim()] })
  return await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ from: account, to: factoryAddress, data, value: '0x0' }] }) as string
}

// TapeOut's X Layer Container opener. The adapter is the official opener
// contract; all writes remain wallet-confirmed and pay its on-chain FEE().
export const tapeoutContainerAbi = [
  { type: 'function', name: 'FEE', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'open', stateMutability: 'payable', inputs: [{ name: 'circuits', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'accountOf', stateMutability: 'view', inputs: [{ name: 'circuits', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'isOpened', stateMutability: 'view', inputs: [{ name: 'circuits', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'isDeployed', stateMutability: 'view', inputs: [{ name: 'circuits', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
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

export type TapeoutContainerStatus = {
  address: string
  account: string
  fee: string
  opened: boolean
  deployed: boolean
}

export async function readTapeoutContainer(circuitId: bigint): Promise<TapeoutContainerStatus | null> {
  if (!containerAdapterAddress || !tapeoutProcessorAddress) return null
  const args = [tapeoutProcessorAddress as `0x${string}`, circuitId] as const
  try {
    const [account, fee, opened, deployed] = await Promise.all([
      publicClient.readContract({ address: containerAdapterAddress as `0x${string}`, abi: tapeoutContainerAbi, functionName: 'accountOf', args }),
      publicClient.readContract({ address: containerAdapterAddress as `0x${string}`, abi: tapeoutContainerAbi, functionName: 'FEE' }),
      publicClient.readContract({ address: containerAdapterAddress as `0x${string}`, abi: tapeoutContainerAbi, functionName: 'isOpened', args }),
      publicClient.readContract({ address: containerAdapterAddress as `0x${string}`, abi: tapeoutContainerAbi, functionName: 'isDeployed', args }),
    ])
    return { address: account, account, fee: formatEther(fee), opened, deployed }
  } catch {
    return { address: tapeoutContainerAddress, account: '', fee: '0.08', opened: false, deployed: false }
  }
}

export async function openTapeoutContainer(circuitId: bigint, account: string) {
  if (!window.ethereum) throw new Error('Connect an EVM wallet first.')
  if (!containerAdapterAddress || !tapeoutProcessorAddress) throw new Error('TapeOut Container opener or Processor is not configured.')
  const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string
  if (Number.parseInt(chainId, 16) !== XLAYER_CHAIN_ID) throw new Error('Switch your wallet to X Layer first.')
  const fee = await publicClient.readContract({ address: containerAdapterAddress as `0x${string}`, abi: tapeoutContainerAbi, functionName: 'FEE' })
  const data = encodeFunctionData({ abi: tapeoutContainerAbi, functionName: 'open', args: [tapeoutProcessorAddress as `0x${string}`, circuitId] })
  return await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ from: account, to: containerAdapterAddress, data, value: `0x${fee.toString(16)}` }] }) as string
}

/** Wait for a wallet-submitted X Layer transaction before reading dependent state. */
export async function waitForTransaction(txHash: string) {
  if (!txHash) throw new Error('Wallet did not return a transaction hash.')
  return publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
}

export async function runCircuit(circuitId: bigint, inputHex: `0x${string}`, price: string) {
  if (!window.ethereum) throw new Error('Connect an EVM wallet first.')
  if (!routerAddress) throw new Error('Router contract is not configured. Add VITE_ROUTER_ADDRESS to .env.local.')
  const data = encodeFunctionData({ abi: routerAbi, functionName: 'runEval', args: [circuitId, inputHex] })
  return await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ to: routerAddress, data, value: `0x${parseEther(price).toString(16)}` }] }) as string
}

export async function depositToVault(amount: string) {
  if (!window.ethereum) throw new Error('Connect an EVM wallet first.')
  if (!revenueVaultAddress) throw new Error('Revenue Vault is not configured. Add VITE_REVENUE_VAULT_ADDRESS to .env.local.')
  const data = encodeFunctionData({ abi: revenueVaultAbi, functionName: 'deposit' })
  return await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ to: revenueVaultAddress, data, value: `0x${parseEther(amount).toString(16)}` }] }) as string
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

async function verifyManifestDocument(input: CircuitLicenseInput, expectedJson: string, expectedHash: string) {
  const uri = input.manifestURI.trim()
  const url = uri.startsWith('ipfs://') ? ipfsGateway.replace(/\/$/, '') + '/' + uri.slice(7) : uri
  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store' })
  } catch {
    throw new Error('Manifest URI 无法访问。请使用可公开读取的 JSON 直链，而不是网站首页。')
  }
  if (!response.ok) throw new Error('Manifest URI 返回 HTTP ' + response.status + '，请先确认 JSON 文件已公开部署。')
  const raw = await response.text()
  const contentType = response.headers.get('content-type') || ''
  if (/text\/html/i.test(contentType) || /^\s*</.test(raw)) throw new Error('Manifest URI 返回的是网页 HTML，不是 Manifest JSON 直链。')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Manifest URI 的内容不是有效 JSON。')
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Manifest JSON 必须是一个对象。')
  const actualHash = keccak256(stringToHex(raw))
  if (actualHash !== expectedHash || raw !== expectedJson) {
    throw new Error('Manifest JSON 与当前表单不完全一致。请使用页面提供的固定 Manifest，或重新部署与表单完全相同的 JSON。')
  }
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
  await verifyManifestDocument(input, manifestJson, manifestHash)
  const data = encodeFunctionData({ abi: registryAbi, functionName: 'publish', args: [id, manifestHash, input.manifestURI.trim(), parseEther(input.price), input.creatorBps, input.processorBps] })
  const txHash = await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ from: account, to: registryAddress, data, value: '0x0' }] }) as string
  return { txHash, manifestJson, manifestHash }
}

export async function readPublishedCircuits() {
  if (!registryAddress) return []
  const configuredCircuitId = import.meta.env.VITE_CIRCUIT_ID
  if (configuredCircuitId) {
    const circuitId = BigInt(configuredCircuitId)
    const current = await publicClient.readContract({ address: registryAddress as `0x${string}`, abi: manifestViewAbi, functionName: 'manifests', args: [circuitId] })
    if (!current[7] || current[1] === '0x' + '00'.repeat(32) || !current[6]) return []
    const uri = current[6]
    const url = uri.startsWith('ipfs://') ? ipfsGateway.replace(/\/$/, '') + '/' + uri.slice(7) : uri
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) throw new Error('Manifest fetch failed (' + response.status + ')')
    const raw = await response.text()
    if (keccak256(stringToHex(raw)) !== current[1]) throw new Error('Manifest hash mismatch for Circuit #' + configuredCircuitId)
    const manifest = JSON.parse(raw) as { circuitId: string; name: string; description?: string; version: string; processor: string; inputSchema: string; outputSchema: string; price: string }
    if (BigInt(manifest.circuitId) !== circuitId) throw new Error('Manifest Circuit ID does not match Registry state.')
    const creatorShare = Number(current[3]) / 100
    const processorShare = Number(current[4]) / 100
    return [{ id: configuredCircuitId, name: manifest.name, description: manifest.description || 'Published TapeOut circuit.', circuitId, processor: manifest.processor, version: manifest.version, inputSchema: manifest.inputSchema, outputSchema: manifest.outputSchema, price: manifest.price, creator: current[0], creatorShare, processorShare, commonsShare: 100 - creatorShare - processorShare, calls: 0, status: 'live' as const, accent: 'cyan', glyph: manifest.name.slice(0, 1).toUpperCase() }]
  }
  const latest = await publicClient.getBlockNumber()
  const fromBlock = latest - registryDeploymentBlock > 10000n ? latest - 10000n : registryDeploymentBlock
  if (fromBlock > latest) return []
  const logs = []
  for (let start = fromBlock; start <= latest; start += 100n) {
    const end = start + 99n < latest ? start + 99n : latest
    const chunk = await publicClient.getLogs({ address: registryAddress as `0x${string}`, event: manifestPublishedEvent, fromBlock: start, toBlock: end })
    logs.push(...chunk)
  }
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
  const logs = []
  for (let start = fromBlock; start <= latest; start += 100n) {
    const end = start + 99n < latest ? start + 99n : latest
    const chunk = await publicClient.getLogs({ address: routerAddress as `0x${string}`, event: usageReceiptEvent, fromBlock: start, toBlock: end })
    logs.push(...chunk)
  }
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
