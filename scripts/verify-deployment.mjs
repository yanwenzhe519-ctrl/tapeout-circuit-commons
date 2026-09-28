import fs from 'node:fs'
import process from 'node:process'
import { createPublicClient, getAddress, http, keccak256, parseAbi, stringToHex } from 'viem'

const env = { ...loadEnv('.env.local'), ...process.env }
const rpcUrl = env.VITE_XLAYER_RPC_URL || 'https://rpc.xlayer.tech'
const expectedChainId = 196
const addresses = {
  registry: env.VITE_REGISTRY_ADDRESS,
  router: env.VITE_ROUTER_ADDRESS,
  factory: env.VITE_FACTORY_ADDRESS,
  processor: env.VITE_TAPEOUT_PROCESSOR_ADDRESS,
  processorRecipient: env.VITE_PROCESSOR_RECIPIENT_ADDRESS,
  podAccount: env.VITE_POD_ACCOUNT_ADDRESS,
  vault: env.VITE_REVENUE_VAULT_ADDRESS,
  ownershipAdapter: env.VITE_TAPEOUT_OWNERSHIP_ADAPTER_ADDRESS,
  containerAdapter: env.VITE_TAPEOUT_CONTAINER_ADAPTER_ADDRESS,
  containerAddress: env.VITE_TAPEOUT_CONTAINER_ADDRESS,
}

const errors = []
const warnings = []
const client = createPublicClient({ transport: http(rpcUrl) })

function loadEnv(path) {
  if (!fs.existsSync(path)) return {}
  return Object.fromEntries(fs.readFileSync(path, 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#') && line.includes('=')).map((line) => {
    const index = line.indexOf('=')
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')]
  }))
}

function addressOrError(label, value, required = true) {
  if (!value) {
    if (required) errors.push(`${label}: missing`)
    else warnings.push(`${label}: not configured`)
    return null
  }
  try { return getAddress(value) } catch { errors.push(`${label}: invalid address ${value}`); return null }
}

async function main() {
  console.log(`RPC: ${rpcUrl}`)
  const chainId = await client.getChainId()
  console.log(`Chain ID: ${chainId}`)
  if (chainId !== expectedChainId) errors.push(`Expected X Layer chain ID ${expectedChainId}, got ${chainId}`)

  const normalized = Object.fromEntries(Object.entries(addresses).map(([key, value]) => [key, addressOrError(key, value, !['vault', 'containerAdapter', 'podAccount', 'containerAddress'].includes(key))]))
  for (const [label, address] of Object.entries(normalized)) {
    if (!address) continue
    if (label === 'containerAddress') {
      console.log(`containerAddress: ${address} (deterministic; bytecode appears after opener execution)`)
      continue
    }
    const code = await client.getCode({ address })
    if (!code || code === '0x') errors.push(`${label}: no contract bytecode at ${address}`)
    else console.log(`${label}: ${address} OK`)
  }

  const routerAddress = normalized.router
  const factoryAddress = normalized.factory
  const registryAddress = normalized.registry
  const circuitId = env.VITE_CIRCUIT_ID
  if (normalized.containerAdapter && normalized.processor && circuitId !== undefined && circuitId !== '') {
    try {
      const [account, opened, deployed, fee] = await Promise.all([
        client.readContract({ address: normalized.containerAdapter, abi: parseAbi(['function accountOf(address,uint256) view returns (address)']), functionName: 'accountOf', args: [normalized.processor, BigInt(circuitId)] }),
        client.readContract({ address: normalized.containerAdapter, abi: parseAbi(['function isOpened(address,uint256) view returns (bool)']), functionName: 'isOpened', args: [normalized.processor, BigInt(circuitId)] }),
        client.readContract({ address: normalized.containerAdapter, abi: parseAbi(['function isDeployed(address,uint256) view returns (bool)']), functionName: 'isDeployed', args: [normalized.processor, BigInt(circuitId)] }),
        client.readContract({ address: normalized.containerAdapter, abi: parseAbi(['function FEE() view returns (uint256)']), functionName: 'FEE' }),
      ])
      console.log(`Container for Circuit ${circuitId}: ${account} / opened=${opened} / deployed=${deployed} / fee=${fee} wei`)
      if (!opened) errors.push(`Circuit ${circuitId}: official Container is not open`)
      if (!deployed) errors.push(`Circuit ${circuitId}: official Container account is not deployed`)
      if (normalized.containerAddress && account.toLowerCase() !== normalized.containerAddress.toLowerCase()) errors.push(`containerAddress: does not match TapeOut accountOf(${circuitId})`)
      if (!normalized.containerAddress && account !== '0x0000000000000000000000000000000000000000') {
        normalized.containerAddress = getAddress(account)
        const index = warnings.indexOf('containerAddress: not configured')
        if (index >= 0) warnings.splice(index, 1)
        console.log(`containerAddress: resolved from TapeOut accountOf(${circuitId})`)
      }
    } catch (error) {
      errors.push(`Container opener read failed (${error instanceof Error ? error.message : String(error)})`)
    }
  }
  if (normalized.processor && circuitId !== undefined && circuitId !== '') {
    try {
      const [nextId, circuitOwner] = await Promise.all([
        client.readContract({ address: normalized.processor, abi: parseAbi(['function nextId() view returns (uint256)']), functionName: 'nextId' }),
        client.readContract({ address: normalized.processor, abi: parseAbi(['function ownerOf(uint256) view returns (address)']), functionName: 'ownerOf', args: [BigInt(circuitId)] }),
      ])
      console.log(`Circuit ${circuitId}: owner=${circuitOwner} / nextId=${nextId}`)
      // This Processor exposes nextId as the latest minted ID (not the next
      // free ID). ownerOf is the authoritative liveness check.
      if (BigInt(circuitId) <= 0n || BigInt(circuitId) > nextId || circuitOwner === '0x0000000000000000000000000000000000000000') errors.push(`Circuit ${circuitId}: not a live TapeOut Circuit`)
    } catch (error) {
      errors.push(`Processor Circuit read failed (${error instanceof Error ? error.message : String(error)})`)
    }
  }
  if (!normalized.podAccount && factoryAddress && circuitId !== undefined && circuitId !== '') {
    try {
      const pod = await client.readContract({ address: factoryAddress, abi: parseAbi(['function podOf(uint256) view returns (address)']), functionName: 'podOf', args: [BigInt(circuitId)] })
      if (pod !== '0x0000000000000000000000000000000000000000') {
        normalized.podAccount = getAddress(pod)
        const index = warnings.indexOf('podAccount: not configured')
        if (index >= 0) warnings.splice(index, 1)
        const code = await client.getCode({ address: normalized.podAccount })
        if (!code || code === '0x') errors.push(`podAccount: no contract bytecode at ${normalized.podAccount}`)
        else console.log(`podAccount: ${normalized.podAccount} resolved from Factory`)
      }
    } catch (error) {
      errors.push(`Factory Pod read failed (${error instanceof Error ? error.message : String(error)})`)
    }
  }
  if (normalized.podAccount && normalized.ownershipAdapter && circuitId !== undefined && circuitId !== '') {
    try {
      const [podOwnership, podCircuit, podController] = await Promise.all([
        client.readContract({ address: normalized.podAccount, abi: parseAbi(['function ownership() view returns (address)']), functionName: 'ownership' }),
        client.readContract({ address: normalized.podAccount, abi: parseAbi(['function circuitId() view returns (uint256)']), functionName: 'circuitId' }),
        client.readContract({ address: normalized.podAccount, abi: parseAbi(['function owner() view returns (address)']), functionName: 'owner' }),
      ])
      console.log(`Pod Account: ${normalized.podAccount} / controller=${podController} / circuit=${podCircuit}`)
      if (podOwnership.toLowerCase() !== normalized.ownershipAdapter.toLowerCase()) errors.push(`podAccount: ownership adapter mismatch (${podOwnership})`)
      if (BigInt(podCircuit) !== BigInt(circuitId)) errors.push(`podAccount: Circuit ID mismatch (${podCircuit})`)
      if (podController === '0x0000000000000000000000000000000000000000') errors.push('podAccount: current TapeOut owner is zero')
    } catch (error) {
      errors.push(`Pod Account read failed (${error instanceof Error ? error.message : String(error)})`)
    }
  }
  if (registryAddress && circuitId !== undefined && circuitId !== '') {
    try {
      const manifest = await client.readContract({
        address: registryAddress,
        abi: parseAbi(['function manifests(uint256) view returns (address,bytes32,uint256,uint16,uint16,address,string,bool)']),
        functionName: 'manifests',
        args: [BigInt(circuitId)],
      })
      console.log(`Circuit ${circuitId}: ${manifest[7] ? 'active' : 'inactive'} / URI ${manifest[6] || 'empty'}`)
      if (!manifest[0] || manifest[1] === '0x' + '00'.repeat(32) || !manifest[6]) errors.push(`Circuit ${circuitId}: incomplete manifest`)
      if (!manifest[7]) errors.push(`Circuit ${circuitId}: manifest is inactive`)
      if (manifest[6]) {
        const response = await fetch(manifest[6], { signal: AbortSignal.timeout(10000) })
        if (!response.ok) throw new Error(`Manifest fetch returned HTTP ${response.status}`)
        const document = JSON.parse(await response.text())
        const canonicalHash = keccak256(stringToHex(JSON.stringify(document, null, 2)))
        if (canonicalHash !== manifest[1]) errors.push(`Circuit ${circuitId}: public Manifest hash does not match Registry`)
        if (String(document.circuitId) !== String(circuitId)) errors.push(`Circuit ${circuitId}: public Manifest has the wrong Circuit ID`)
        if (normalized.processor && String(document.processor).toLowerCase() !== normalized.processor.toLowerCase()) errors.push(`Circuit ${circuitId}: public Manifest has the wrong Processor`)
        console.log(`Circuit ${circuitId}: public Manifest hash verified`)
      }
    } catch (error) {
      errors.push(`Circuit ${circuitId}: Registry read failed (${error instanceof Error ? error.message : String(error)})`)
    }
  } else if (registryAddress) {
    warnings.push('VITE_CIRCUIT_ID not set; skipped manifest read')
  }

  if (env.VITE_ENABLE_LIVE_CALLS !== 'true') warnings.push('VITE_ENABLE_LIVE_CALLS is not true; paid calls remain disabled')
  if (!env.VITE_TAPEOUT_OWNERSHIP_ADAPTER_ADDRESS) warnings.push('Ownership adapter is required before publishing')
  if (!env.VITE_TAPEOUT_CONTAINER_ADAPTER_ADDRESS) warnings.push('Container adapter is required before Pod creation or handoff')
  if (routerAddress && registryAddress) {
    try {
      const configuredRecipient = await client.readContract({ address: routerAddress, abi: parseAbi(['function processorRecipient() view returns (address)']), functionName: 'processorRecipient' })
      if (normalized.processorRecipient && configuredRecipient.toLowerCase() !== normalized.processorRecipient.toLowerCase()) errors.push(`processorRecipient: Router points to ${configuredRecipient}, expected ${normalized.processorRecipient}`)
      console.log(`Router processorRecipient: ${configuredRecipient}`)
    } catch (error) {
      errors.push(`Router processorRecipient read failed (${error instanceof Error ? error.message : String(error)})`)
    }
    console.log('Router and Registry bytecode checks passed')
  }
  if (factoryAddress && registryAddress) {
    try {
      const configuredFactory = await client.readContract({ address: registryAddress, abi: parseAbi(['function factory() view returns (address)']), functionName: 'factory' })
      if (configuredFactory.toLowerCase() !== factoryAddress.toLowerCase()) errors.push(`factory: Registry points to ${configuredFactory}, expected ${factoryAddress}`)
      console.log(`Registry factory: ${configuredFactory}`)
    } catch (error) {
      errors.push(`Registry factory read failed (${error instanceof Error ? error.message : String(error)})`)
    }
  }
  if (warnings.length) console.log(`\nWarnings:\n- ${warnings.join('\n- ')}`)
  if (errors.length) {
    console.error(`\nDeployment verification failed:\n- ${errors.join('\n- ')}`)
    process.exitCode = 1
    return
  }
  console.log('\nDeployment verification passed.')
}

main().catch((error) => {
  console.error(`Deployment verification could not reach X Layer: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
