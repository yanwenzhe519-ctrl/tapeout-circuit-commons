import fs from 'node:fs'
import process from 'node:process'
import { createPublicClient, getAddress, http, parseAbi } from 'viem'

const env = { ...loadEnv('.env.local'), ...process.env }
const rpcUrl = env.VITE_XLAYER_RPC_URL || 'https://rpc.xlayer.tech'
const expectedChainId = 196
const addresses = {
  registry: env.VITE_REGISTRY_ADDRESS,
  router: env.VITE_ROUTER_ADDRESS,
  processor: env.VITE_TAPEOUT_PROCESSOR_ADDRESS,
  vault: env.VITE_REVENUE_VAULT_ADDRESS,
  ownershipAdapter: env.VITE_TAPEOUT_OWNERSHIP_ADAPTER_ADDRESS,
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

  const normalized = Object.fromEntries(Object.entries(addresses).map(([key, value]) => [key, addressOrError(key, value, key !== 'vault')]))
  for (const [label, address] of Object.entries(normalized)) {
    if (!address) continue
    const code = await client.getCode({ address })
    if (!code || code === '0x') errors.push(`${label}: no contract bytecode at ${address}`)
    else console.log(`${label}: ${address} OK`)
  }

  const routerAddress = normalized.router
  const registryAddress = normalized.registry
  const circuitId = env.VITE_CIRCUIT_ID
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
    } catch (error) {
      errors.push(`Circuit ${circuitId}: Registry read failed (${error instanceof Error ? error.message : String(error)})`)
    }
  } else {
    warnings.push('VITE_CIRCUIT_ID not set; skipped manifest read')
  }

  if (env.VITE_ENABLE_LIVE_CALLS !== 'true') warnings.push('VITE_ENABLE_LIVE_CALLS is not true; paid calls remain disabled')
  if (!env.VITE_TAPEOUT_OWNERSHIP_ADAPTER_ADDRESS) warnings.push('Ownership adapter is required before publishing')
  if (routerAddress && registryAddress) console.log('Router and Registry bytecode checks passed')
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
