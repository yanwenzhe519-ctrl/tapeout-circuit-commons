import React, { useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import {
  Check,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FileArchive,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Wallet,
} from 'lucide-react'
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  formatEther,
  formatGwei,
  http,
  keccak256,
  parseGwei,
  stringToHex,
  type Hex,
} from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import './publisher.css'

const XLAYER_CHAIN_ID = 196
const XLAYER_HEX_CHAIN_ID = '0xc4'
const RPC_URL = import.meta.env.VITE_XLAYER_RPC_URL || 'https://rpc.xlayer.tech'
const SITE_REGISTRY = (import.meta.env.VITE_TAPEKIT_SITE_REGISTRY_ADDRESS || '0xd6efb7adcc9c83dc4924ad56f6a8e4e969b9adb6') as Hex
const DOMAIN_BINDING = (import.meta.env.VITE_TAPEKIT_DOMAIN_BINDING_ADDRESS || '0x68809fd2fb343aa57d0aeb7f33defe477c9666f9') as Hex
const CIRCUIT_COMMONS_REGISTRY = (import.meta.env.VITE_REGISTRY_ADDRESS || '0xcCc8087Ef66f4728efCf18A9e785A05B4e10639B') as Hex
const CONTAINER = (import.meta.env.VITE_TAPEOUT_CONTAINER_ADDRESS || '0x25A1D87789aE72E326B3A987F610F08219aA0764') as Hex
const CIRCUIT_ID = BigInt(import.meta.env.VITE_CIRCUIT_ID || '1')
const PROCESSOR_INDEX = Number(import.meta.env.VITE_TAPEOUT_PROCESSOR_INDEX || '177')
const XLAYER_AREA_CODE = 2
const EXPECTED_OWNER = (import.meta.env.VITE_ADMIN_WALLET_ADDRESS || '0x05667DE34Ad47bAFe8a8b976c19809cAdf7719D2').toLowerCase()
const GATEWAY = import.meta.env.VITE_TAPEKIT_GATEWAY || 'tapekit.org'
const DEWEB_NAME = `${CIRCUIT_ID}.${XLAYER_AREA_CODE}.${PROCESSOR_INDEX}.tape`
const DEWEB_URL = `https://${CIRCUIT_ID}-${XLAYER_AREA_CODE}-${PROCESSOR_INDEX}.${GATEWAY}/`
const CHUNK_SIZE = 24_000
const MAX_FILE_SIZE = 8 * 1024 * 1024
const OPERATOR_KEY = `circuit-commons:deweb-operator:${XLAYER_CHAIN_ID}`
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Hex

const xLayer = defineChain({
  id: XLAYER_CHAIN_ID,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer' } },
})

const publicClient = createPublicClient({ chain: xLayer, transport: http(RPC_URL) })

const siteRegistryAbi = [
  { type: 'function', name: 'putFile', stateMutability: 'nonpayable', inputs: [{ name: 'container', type: 'address' }, { name: 'path', type: 'string' }, { name: 'contentType', type: 'string' }, { name: 'sha256Hash', type: 'bytes32' }, { name: 'data', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'appendChunk', stateMutability: 'nonpayable', inputs: [{ name: 'container', type: 'address' }, { name: 'path', type: 'string' }, { name: 'expectIndex', type: 'uint256' }, { name: 'data', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'setFallback', stateMutability: 'nonpayable', inputs: [{ name: 'container', type: 'address' }, { name: 'path', type: 'string' }], outputs: [] },
  { type: 'function', name: 'fallbackPath', stateMutability: 'view', inputs: [{ name: 'container', type: 'address' }], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'setOperator', stateMutability: 'nonpayable', inputs: [{ name: 'container', type: 'address' }, { name: 'op', type: 'address' }, { name: 'ttl', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'operatorUntil', stateMutability: 'view', inputs: [{ name: 'container', type: 'address' }], outputs: [{ name: '', type: 'uint40' }] },
  { type: 'function', name: 'pathCount', stateMutability: 'view', inputs: [{ name: 'container', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'pathsRange', stateMutability: 'view', inputs: [{ name: 'container', type: 'address' }, { name: 'from', type: 'uint256' }, { name: 'n', type: 'uint256' }], outputs: [{ name: '', type: 'string[]' }] },
  { type: 'function', name: 'fileInfo', stateMutability: 'view', inputs: [{ name: 'container', type: 'address' }, { name: 'path', type: 'string' }], outputs: [{ name: 'size', type: 'uint32' }, { name: 'contentType', type: 'string' }, { name: 'sha256Hash', type: 'bytes32' }, { name: 'updatedAt', type: 'uint40' }, { name: 'chunkCount', type: 'uint256' }] },
  { type: 'function', name: 'isOwner', stateMutability: 'view', inputs: [{ name: 'container', type: 'address' }, { name: 'who', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'canEdit', stateMutability: 'view', inputs: [{ name: 'container', type: 'address' }, { name: 'who', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
] as const

const domainBindingAbi = [
  { type: 'function', name: 'bind', stateMutability: 'payable', inputs: [{ name: 'domain', type: 'string' }, { name: 'container', type: 'address' }, { name: 'months', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'isLive', stateMutability: 'view', inputs: [{ name: 'domain', type: 'string' }, { name: 'container', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'paidUntil', stateMutability: 'view', inputs: [{ name: 'domainHash', type: 'bytes32' }, { name: 'container', type: 'address' }], outputs: [{ name: '', type: 'uint40' }] },
] as const

const circuitCommonsRegistryAbi = [
  { type: 'function', name: 'manifests', stateMutability: 'view', inputs: [{ name: 'circuitId', type: 'uint256' }], outputs: [{ name: 'publisher', type: 'address' }, { name: 'hash', type: 'bytes32' }, { name: 'price', type: 'uint256' }, { name: 'creatorBps', type: 'uint16' }, { name: 'processorBps', type: 'uint16' }, { name: 'revenueRecipient', type: 'address' }, { name: 'manifestURI', type: 'string' }, { name: 'active', type: 'bool' }] },
  { type: 'function', name: 'publish', stateMutability: 'nonpayable', inputs: [{ name: 'circuitId', type: 'uint256' }, { name: 'manifestHash', type: 'bytes32' }, { name: 'manifestURI', type: 'string' }, { name: 'price', type: 'uint256' }, { name: 'creatorBps', type: 'uint16' }, { name: 'processorBps', type: 'uint16' }], outputs: [] },
] as const

type LocalFile = {
  path: string
  type: string
  bytes: Uint8Array
  sha: Hex
  chunks: number
  resumeFrom: number
  oldChunks: number
  unchanged: boolean
}

type DeploymentPlan = {
  files: LocalFile[]
  uploadFiles: LocalFile[]
  chunks: number
  bytes: number
  gasPrice: bigint
  estimatedWei: bigint
  operatorFundingWei: bigint
  leftovers: string[]
}

function short(value: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : '—'
}

function contentType(path: string) {
  const ext = path.split('.').pop()?.toLowerCase()
  return ({
    html: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'text/javascript; charset=utf-8',
    mjs: 'text/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    txt: 'text/plain; charset=utf-8',
  } as Record<string, string>)[ext || ''] || 'application/octet-stream'
}

function cleanPath(file: File) {
  const raw = (file.webkitRelativePath || file.name).replaceAll('\\', '/')
  const parts = raw.split('/').filter(Boolean)
  const relative = parts.length > 1 ? parts.slice(1).join('/') : parts[0]
  if (!relative || relative.startsWith('/') || relative.includes('..') || /[\u0000-\u001f]/.test(relative)) throw new Error(`不安全的文件路径：${raw}`)
  return relative
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer)
  return `0x${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')}` as Hex
}

function gasLimitFor(bytes: number) {
  return BigInt(Math.min(16_500_000, 400_000 + bytes * 260))
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'shortMessage' in error) return String((error as { shortMessage?: unknown }).shortMessage)
  return String(error)
}

function hexBytes(bytes: Uint8Array) {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}` as Hex
}

async function sendFromBrowser(account: Hex, to: Hex, data: Hex, value = 0n) {
  if (!window.ethereum) throw new Error('没有检测到钱包扩展。')
  const hash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{ from: account, to, data, value: `0x${value.toString(16)}` }],
  }) as Hex
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })
  if (receipt.status !== 'success') throw new Error(`交易执行失败：${hash}`)
  return hash
}

async function retry<T>(task: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i += 1) {
    try { return await task() } catch (error) {
      last = error
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 2_000 * (i + 1)))
    }
  }
  throw last
}

function Publisher() {
  const [account, setAccount] = useState<Hex | ''>('')
  const [chainReady, setChainReady] = useState(false)
  const [ownerReady, setOwnerReady] = useState(false)
  const [files, setFiles] = useState<LocalFile[]>([])
  const [plan, setPlan] = useState<DeploymentPlan | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('等待连接钱包')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [logs, setLogs] = useState<string[]>([])
  const [deployed, setDeployed] = useState(false)
  const pickerRef = useRef<HTMLInputElement | null>(null)

  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.bytes.length, 0), [files])

  function log(line: string) {
    setLogs((current) => [...current, `[${new Date().toLocaleTimeString()}] ${line}`])
  }

  async function connect() {
    if (!window.ethereum) throw new Error('请在安装了 OKX Wallet 的浏览器中打开此页面。')
    setBusy(true)
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as Hex[]
      let chainId = Number.parseInt(await window.ethereum.request({ method: 'eth_chainId' }) as string, 16)
      if (chainId !== XLAYER_CHAIN_ID) {
        try {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: XLAYER_HEX_CHAIN_ID }] })
        } catch (error) {
          if ((error as { code?: number }).code !== 4902) throw error
          await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: XLAYER_HEX_CHAIN_ID, chainName: 'X Layer', nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 }, rpcUrls: [RPC_URL], blockExplorerUrls: ['https://www.oklink.com/xlayer'] }] })
        }
        chainId = Number.parseInt(await window.ethereum.request({ method: 'eth_chainId' }) as string, 16)
      }
      const next = accounts[0]
      if (!next) throw new Error('钱包没有返回可用账户。')
      const isOwner = await publicClient.readContract({ address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'isOwner', args: [CONTAINER, next] })
      setAccount(next)
      setChainReady(chainId === XLAYER_CHAIN_ID)
      setOwnerReady(isOwner)
      setPhase(isOwner ? '钱包与 Container 所有权已验证' : '当前钱包不是 Container 所有者')
      log(`钱包 ${short(next)} 已连接；Container owner=${isOwner}`)
    } finally {
      setBusy(false)
    }
  }

  async function selectFiles(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    setPlan(null)
    try {
      const next: LocalFile[] = []
      for (const file of Array.from(list)) {
        const path = cleanPath(file)
        if (file.size > MAX_FILE_SIZE) throw new Error(`${path} 超过 8 MB，不能写入 SiteRegistry。`)
        const bytes = new Uint8Array(await file.arrayBuffer())
        next.push({ path, type: contentType(path), bytes, sha: await sha256(bytes), chunks: Math.max(1, Math.ceil(bytes.length / CHUNK_SIZE)), resumeFrom: 0, oldChunks: 0, unchanged: false })
      }
      next.sort((a, b) => a.path.localeCompare(b.path))
      if (!next.some((file) => file.path === 'index.html')) throw new Error('所选目录没有 index.html。请选择 npm run build 生成的 dist 文件夹。')
      setFiles(next)
      setPhase(`已读取 ${next.length} 个构建文件`)
      log(`选择了 ${next.length} 个文件，共 ${(next.reduce((sum, file) => sum + file.bytes.length, 0) / 1024).toFixed(1)} KB`)
    } finally {
      setBusy(false)
    }
  }

  async function prepare() {
    if (!files.length || !ownerReady) return
    setBusy(true)
    setPhase('正在比对链上文件并估算 Gas')
    try {
      const planned: LocalFile[] = []
      for (const file of files) {
        const info = await retry(() => publicClient.readContract({ address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'fileInfo', args: [CONTAINER, file.path] }))
        const size = Number(info[0])
        const currentHash = info[2]
        const oldChunks = Number(info[4])
        const unchanged = size === file.bytes.length && currentHash.toLowerCase() === file.sha.toLowerCase() && oldChunks > 0
        const resumeFrom = !unchanged && currentHash.toLowerCase() === file.sha.toLowerCase() && oldChunks > 0 && oldChunks < file.chunks && size === oldChunks * CHUNK_SIZE ? oldChunks : 0
        planned.push({ ...file, oldChunks, unchanged, resumeFrom })
      }
      const uploadFiles = planned.filter((file) => !file.unchanged)
      const chunks = uploadFiles.reduce((sum, file) => sum + file.chunks - file.resumeFrom, 0)
      const bytes = uploadFiles.reduce((sum, file) => sum + Math.max(0, file.bytes.length - file.resumeFrom * CHUNK_SIZE), 0)
      const floor = parseGwei('0.05')
      const rpcGasPrice = await publicClient.getGasPrice().catch(() => floor)
      const gasPrice = rpcGasPrice < floor ? floor : rpcGasPrice > floor * 20n ? floor * 20n : rpcGasPrice
      const estimatedWei = BigInt(chunks * 270_000 + bytes * 235) * gasPrice
      const maxChunk = Math.min(CHUNK_SIZE, Math.max(0, ...uploadFiles.map((file) => file.bytes.length)))
      const operatorFundingWei = estimatedWei * 13n / 10n + gasLimitFor(maxChunk) * gasPrice + 500_000_000_000_000n
      const pathCount = Number(await publicClient.readContract({ address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'pathCount', args: [CONTAINER] }))
      const existingPaths = pathCount ? await publicClient.readContract({ address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'pathsRange', args: [CONTAINER, 0n, BigInt(Math.min(pathCount, 500))] }) : []
      const selected = new Set(planned.map((file) => file.path))
      const leftovers = existingPaths.filter((path) => !selected.has(path))
      const nextPlan = { files: planned, uploadFiles, chunks, bytes, gasPrice, estimatedWei, operatorFundingWei, leftovers }
      setFiles(planned)
      setPlan(nextPlan)
      setPhase(uploadFiles.length ? '部署计划已生成，等待确认' : '链上文件已是最新版本')
      log(`计划：${uploadFiles.length} 个变更文件、${chunks} 笔分块交易；Gas 估算 ${formatEther(estimatedWei)} OKB`)
    } finally {
      setBusy(false)
    }
  }

  function loadOperator() {
    let privateKey = sessionStorage.getItem(OPERATOR_KEY) as Hex | null
    if (!privateKey) {
      privateKey = generatePrivateKey()
      sessionStorage.setItem(OPERATOR_KEY, privateKey)
    }
    return privateKeyToAccount(privateKey)
  }

  async function ensureOperator(owner: Hex, needWei: bigint) {
    const operator = loadOperator()
    const balance = await publicClient.getBalance({ address: operator.address })
    if (balance < needWei) {
      const amount = needWei - balance
      setPhase('请在钱包中确认临时操作员 Gas')
      log(`为临时操作员 ${short(operator.address)} 充值 ${formatEther(amount)} OKB`)
      await sendFromBrowser(owner, operator.address, '0x', amount)
    }
    const [canEdit, until] = await Promise.all([
      publicClient.readContract({ address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'canEdit', args: [CONTAINER, operator.address] }),
      publicClient.readContract({ address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'operatorUntil', args: [CONTAINER] }),
    ])
    if (!canEdit || Number(until) - Date.now() / 1000 < 7_200) {
      setPhase('请在钱包中授权 24 小时临时操作员')
      const data = encodeFunctionData({ abi: siteRegistryAbi, functionName: 'setOperator', args: [CONTAINER, operator.address, 86_400n] })
      await sendFromBrowser(owner, SITE_REGISTRY, data)
    }
    return operator
  }

  async function activateName(owner: Hex) {
    const live = await publicClient.readContract({ address: DOMAIN_BINDING, abi: domainBindingAbi, functionName: 'isLive', args: [DEWEB_NAME, CONTAINER] })
    if (live) {
      log(`${DEWEB_NAME} 已激活`)
      return
    }
    const hash = keccak256(stringToHex(DEWEB_NAME))
    const [paidUntil, block] = await Promise.all([
      publicClient.readContract({ address: DOMAIN_BINDING, abi: domainBindingAbi, functionName: 'paidUntil', args: [hash, CONTAINER] }),
      publicClient.getBlock(),
    ])
    const monthSeconds = 30 * 86_400
    const base = Math.max(Number(paidUntil), Number(block.timestamp))
    const months = Math.max(0, Math.min(120, Math.floor((Number(block.timestamp) + 120 * monthSeconds - base) / monthSeconds)))
    if (months < 1) throw new Error(`${DEWEB_NAME} 已达到最长免费绑定期限，暂时不能继续延长。`)
    setPhase('请在钱包中确认免费 DeWeb 名称激活')
    const data = encodeFunctionData({ abi: domainBindingAbi, functionName: 'bind', args: [DEWEB_NAME, CONTAINER, BigInt(months)] })
    await sendFromBrowser(owner, DOMAIN_BINDING, data)
    log(`${DEWEB_NAME} 已激活 ${months} 个月；服务费为 0，仅支付 X Layer Gas`)
  }

  async function syncProjectManifest(owner: Hex, uploadedFiles: LocalFile[]) {
    const manifestPath = `manifests/circuit-${CIRCUIT_ID}-v1.0.1.json`
    const manifestFile = uploadedFiles.find((file) => file.path === manifestPath)
    if (!manifestFile) throw new Error(`部署包缺少 ${manifestPath}，无法把 Registry 切换到 DeWeb。`)
    const parsed = JSON.parse(new TextDecoder().decode(manifestFile.bytes)) as { circuitId?: string }
    if (BigInt(parsed.circuitId || '0') !== CIRCUIT_ID) throw new Error('Manifest 的 Circuit ID 与发布器配置不一致。')
    const manifestHash = keccak256(stringToHex(JSON.stringify(parsed, null, 2)))
    const current = await publicClient.readContract({ address: CIRCUIT_COMMONS_REGISTRY, abi: circuitCommonsRegistryAbi, functionName: 'manifests', args: [CIRCUIT_ID] })
    if (!current[7] || current[1].toLowerCase() !== manifestHash.toLowerCase()) throw new Error('DeWeb Manifest 与当前 Registry 的链上哈希不一致，已停止切换服务入口。')
    const nextUri = new URL(manifestPath, DEWEB_URL).href
    if (current[6] === nextUri) {
      log(`Circuit Commons Registry 已指向 ${nextUri}`)
      return
    }
    setPhase('请在钱包中确认 Registry 切换到 DeWeb Manifest')
    const data = encodeFunctionData({ abi: circuitCommonsRegistryAbi, functionName: 'publish', args: [CIRCUIT_ID, manifestHash, nextUri, current[2], current[3], current[4]] })
    await sendFromBrowser(owner, CIRCUIT_COMMONS_REGISTRY, data)
    log(`Circuit Commons Registry Manifest 已切换到 ${nextUri}`)
  }

  async function refundAndClear(owner: Hex, operator: ReturnType<typeof privateKeyToAccount>, gasPrice: bigint) {
    const wallet = createWalletClient({ account: operator, chain: xLayer, transport: http(RPC_URL) })
    const balance = await publicClient.getBalance({ address: operator.address })
    const fee = 21_000n * gasPrice
    if (balance > fee) {
      const hash = await wallet.sendTransaction({ to: owner, value: balance - fee, gas: 21_000n, gasPrice })
      await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })
      log(`临时操作员退回 ${formatEther(balance - fee)} OKB`)
    }
    const clearData = encodeFunctionData({ abi: siteRegistryAbi, functionName: 'setOperator', args: [CONTAINER, ZERO_ADDRESS, 0n] })
    await sendFromBrowser(owner, SITE_REGISTRY, clearData)
    sessionStorage.removeItem(OPERATOR_KEY)
    log('临时操作员权限和会话私钥已清除')
  }

  async function deploy() {
    if (!account || !plan || !ownerReady || !chainReady) return
    if (account.toLowerCase() !== EXPECTED_OWNER && !window.confirm('当前钱包与项目记录的 owner 地址不同，但 SiteRegistry 已确认它可以编辑此 Container。仍要继续吗？')) return
    const detail = `即将上传 ${plan.uploadFiles.length} 个变更文件、${plan.chunks} 个分块。\n预计实际上传 Gas：${formatEther(plan.estimatedWei)} OKB（${formatGwei(plan.gasPrice)} gwei）。\n临时操作员充值上限：${formatEther(plan.operatorFundingWei)} OKB，未使用余额会自动退回。\n钱包将确认：操作员充值、24 小时授权、免费 DeWeb 名称激活、Registry 服务入口切换和最后的权限清理。`
    if (!window.confirm(detail)) return
    setBusy(true)
    setProgress({ done: 0, total: plan.chunks })
    let operator: ReturnType<typeof privateKeyToAccount> | null = null
    try {
      operator = await ensureOperator(account, plan.operatorFundingWei)
      const wallet = createWalletClient({ account: operator, chain: xLayer, transport: http(RPC_URL) })
      let sent = 0
      for (const file of plan.uploadFiles) {
        for (let index = file.resumeFrom; index < file.chunks; index += 1) {
          const part = file.bytes.subarray(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
          const extra = index === 0 ? BigInt(file.oldChunks * 6_000) : 0n
          const gas = gasLimitFor(part.length) + extra
          setPhase(`上传 ${file.path} · ${index + 1}/${file.chunks}`)
          const hash = await retry(async () => {
            if (index === 0) {
              const args = [CONTAINER, file.path, file.type, file.sha, hexBytes(part)] as const
              await publicClient.simulateContract({ account: operator, address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'putFile', args, gas, gasPrice: plan.gasPrice })
              return wallet.writeContract({ address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'putFile', args, gas, gasPrice: plan.gasPrice })
            }
            const args = [CONTAINER, file.path, BigInt(index), hexBytes(part)] as const
            await publicClient.simulateContract({ account: operator, address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'appendChunk', args, gas, gasPrice: plan.gasPrice })
            return wallet.writeContract({ address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'appendChunk', args, gas, gasPrice: plan.gasPrice })
          })
          const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })
          if (receipt.status !== 'success') throw new Error(`${file.path} 第 ${index + 1} 块交易失败`)
          sent += 1
          setProgress({ done: sent, total: plan.chunks })
          log(`${index === 0 ? '+' : '…'} ${file.path} ${part.length} B · gas ${receipt.gasUsed}`)
        }
        const info = await publicClient.readContract({ address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'fileInfo', args: [CONTAINER, file.path] })
        if (Number(info[0]) !== file.bytes.length || Number(info[4]) !== file.chunks) throw new Error(`${file.path} 链上校验不一致`)
      }
      const fallback = await publicClient.readContract({ address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'fallbackPath', args: [CONTAINER] })
      if (fallback !== 'index.html') {
        const hash = await wallet.writeContract({ address: SITE_REGISTRY, abi: siteRegistryAbi, functionName: 'setFallback', args: [CONTAINER, 'index.html'], gas: 200_000n, gasPrice: plan.gasPrice })
        await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })
        log('SPA fallback 已设置为 index.html')
      }
      await activateName(account)
      await syncProjectManifest(account, plan.files)
      await refundAndClear(account, operator, plan.gasPrice)
      setDeployed(true)
      setPhase('DeWeb 已部署并完成链上校验')
    } catch (error) {
      log(`失败：${errorMessage(error)}`)
      setPhase(`部署暂停：${errorMessage(error)}`)
      if (operator) {
        try {
          log('正在退回临时操作员余额并清理权限…')
          await refundAndClear(account, operator, plan.gasPrice)
        } catch (cleanupError) {
          log(`自动清理未完成：${errorMessage(cleanupError)}。请勿关闭本标签页，重新发布后会继续使用同一临时操作员。`)
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="publisher-shell">
      <header className="publisher-header">
        <div className="publisher-brand"><span className="brand-grid"><i /><i /><i /><i /></span><span><b>CIRCUIT COMMONS</b><small>X LAYER DEWEB PUBLISHER</small></span></div>
        <a href="/" className="quiet-link">返回产品 <ChevronRight size={14} /></a>
      </header>

      <section className="publisher-hero">
        <div>
          <span className="eyebrow">OWNER-SIGNED RELEASE</span>
          <h1>把生产构建写入<br /><em>TapeOut Container</em></h1>
          <p>发布器只处理 Circuit #{CIRCUIT_ID.toString()} 的官方 Container。文件哈希、分块、fallback 和 DeWeb 名称全部在 X Layer 上验证。</p>
        </div>
        <div className="identity-card">
          <span>PUBLIC IDENTITY</span>
          <strong>{DEWEB_NAME}</strong>
          <a href={DEWEB_URL} target="_blank" rel="noreferrer">{DEWEB_URL}<ExternalLink size={14} /></a>
          <dl><div><dt>Container</dt><dd>{short(CONTAINER)}</dd></div><div><dt>SiteRegistry</dt><dd>{short(SITE_REGISTRY)}</dd></div><div><dt>Network</dt><dd>X Layer · 196</dd></div></dl>
        </div>
      </section>

      <section className="release-grid">
        <div className="release-panel steps-panel">
          <div className="panel-title"><span>01</span><div><h2>连接 owner 钱包</h2><p>只接受 SiteRegistry 能验证为 Container owner 的钱包。</p></div></div>
          <button className="action-button" onClick={() => void connect().catch((error) => setPhase(errorMessage(error)))} disabled={busy}>
            {busy && !account ? <LoaderCircle className="spin" size={17} /> : <Wallet size={17} />}
            {account ? short(account) : '连接 OKX Wallet'}
          </button>
          <div className="check-row"><span className={chainReady ? 'ok' : ''}>{chainReady ? <Check size={13} /> : <i />}</span><b>X Layer 网络</b><small>{chainReady ? '已连接' : '等待验证'}</small></div>
          <div className="check-row"><span className={ownerReady ? 'ok' : ''}>{ownerReady ? <Check size={13} /> : <i />}</span><b>Container 所有权</b><small>{ownerReady ? '链上通过' : '等待验证'}</small></div>
        </div>

        <div className="release-panel steps-panel">
          <div className="panel-title"><span>02</span><div><h2>选择 dist 文件夹</h2><p>先运行 npm run build，再选择整个 dist 目录。</p></div></div>
          <input ref={(node) => { pickerRef.current = node; node?.setAttribute('webkitdirectory', '') }} type="file" multiple hidden onChange={(event) => void selectFiles(event.currentTarget.files).catch((error) => setPhase(errorMessage(error)))} />
          <button className="action-button secondary" onClick={() => pickerRef.current?.click()} disabled={busy || !ownerReady}><FileArchive size={17} />选择构建目录</button>
          <div className="file-summary"><strong>{files.length || '—'}</strong><span>文件</span><strong>{files.length ? `${(totalBytes / 1024).toFixed(1)} KB` : '—'}</strong><span>总大小</span></div>
          <button className="text-button" onClick={() => void prepare().catch((error) => setPhase(errorMessage(error)))} disabled={busy || !files.length || !ownerReady}>{busy && files.length && !plan ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />}生成链上部署计划</button>
        </div>

        <div className="release-panel steps-panel deploy-panel">
          <div className="panel-title"><span>03</span><div><h2>确认并发布</h2><p>临时操作员负责批量分块；发布后退回余额并清除权限。</p></div></div>
          {plan ? <div className="plan-facts"><div><small>变更文件</small><b>{plan.uploadFiles.length}</b></div><div><small>分块交易</small><b>{plan.chunks}</b></div><div><small>预计实际 Gas</small><b>{Number(formatEther(plan.estimatedWei)).toFixed(5)} OKB</b></div><div><small>临时充值上限</small><b>{Number(formatEther(plan.operatorFundingWei)).toFixed(5)} OKB</b></div></div> : <div className="empty-plan">选择构建目录并生成计划后，费用与交易数量会在这里显示。</div>}
          {plan ? <p className="funding-note">Gas price {formatGwei(plan.gasPrice)} gwei。临时充值不是服务费，未使用余额会在发布后退回 owner 钱包。</p> : null}
          {plan?.leftovers.length ? <div className="warning-line"><CircleAlert size={16} /><span>Container 里还有 {plan.leftovers.length} 个旧路径，本次不会自动删除。</span></div> : null}
          <button className="deploy-button" onClick={() => void deploy()} disabled={busy || !plan || !ownerReady || !chainReady || plan.uploadFiles.length === 0}>
            {busy ? <LoaderCircle className="spin" size={18} /> : deployed ? <Check size={18} /> : <UploadCloud size={18} />}
            {deployed ? '发布完成' : busy ? '正在写入 X Layer' : '部署到 DeWeb'}
          </button>
        </div>
      </section>

      <section className="release-console">
        <div className="console-head"><div><ShieldCheck size={17} /><b>发布状态</b></div><span>{phase}</span></div>
        {progress.total > 0 && <div className="progress-track"><span style={{ transform: `scaleX(${progress.done / progress.total})` }} /></div>}
        <pre>{logs.length ? logs.join('\n') : '等待开始。不会读取或要求你的主钱包私钥。'}</pre>
        {deployed && <div className="success-card"><Check size={20} /><div><b>链上文件、fallback 与 DeWeb 名称已完成</b><span>网关同步可能需要几分钟。</span></div><a href={DEWEB_URL} target="_blank" rel="noreferrer">打开网站 <ExternalLink size={14} /></a></div>}
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('publisher-root')!).render(<React.StrictMode><Publisher /></React.StrictMode>)
