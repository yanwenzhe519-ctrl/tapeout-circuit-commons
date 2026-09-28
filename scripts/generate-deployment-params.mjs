import fs from 'node:fs'
import path from 'node:path'

const env = Object.fromEntries(fs.existsSync('.env.deploy')
  ? fs.readFileSync('.env.deploy', 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#') && line.includes('=')).map((line) => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim()] })
  : [])
const get = (key) => process.env[key] || env[key] || ''
const required = ['TAPEOUT_OWNERSHIP_ADAPTER', 'TAPEOUT_PROCESSOR', 'PROCESSOR_RECIPIENT', 'CIRCUIT_ID']
for (const key of required) if (!get(key)) throw new Error(`${key} is required in .env.deploy`)
const params = {
  chainId: 196,
  rpcUrl: get('XLAYER_RPC_URL') || 'https://rpc.xlayer.tech',
  ownershipAdapter: get('TAPEOUT_OWNERSHIP_ADAPTER'),
  processor: get('TAPEOUT_PROCESSOR'),
  processorRecipient: get('PROCESSOR_RECIPIENT'),
  circuitId: get('CIRCUIT_ID'),
  containerAdapter: get('TAPEOUT_CONTAINER_ADAPTER'),
  deployRevenueVault: get('DEPLOY_REVENUE_VAULT') === 'true',
  manifestHash: get('MANIFEST_HASH') || null,
  vaultMaturity: get('VAULT_MATURITY') || null,
  vaultCap: get('VAULT_CAP') || null,
}
fs.mkdirSync(path.join(process.cwd(), 'outputs'), { recursive: true })
fs.writeFileSync(path.join(process.cwd(), 'outputs', 'deployment-params.json'), `${JSON.stringify(params, null, 2)}\n`)
console.log('Deployment parameters written to outputs/deployment-params.json')
