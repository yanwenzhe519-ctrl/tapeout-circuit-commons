import fs from 'node:fs'
import path from 'node:path'
import { keccak256, stringToHex } from 'viem'

const env = Object.fromEntries(fs.existsSync('.env.local')
  ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#') && line.includes('=')).map((line) => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim()] })
  : [])
const get = (key, fallback = '') => process.env[key] || env[key] || fallback
const required = ['VITE_CIRCUIT_ID', 'VITE_TAPEOUT_PROCESSOR_ADDRESS']
for (const key of required) if (!get(key)) throw new Error(`${key} is required`)

const circuitId = get('VITE_CIRCUIT_ID')
const manifestDirectory = path.join(process.cwd(), 'public', 'manifests')
const existingPath = fs.existsSync(manifestDirectory)
  ? fs.readdirSync(manifestDirectory).filter((name) => name.startsWith(`circuit-${circuitId}-`) && name.endsWith('.json')).sort().at(-1)
  : undefined
const existing = existingPath ? JSON.parse(fs.readFileSync(path.join(manifestDirectory, existingPath), 'utf8')) : {}

const creatorBps = Number(get('MANIFEST_CREATOR_BPS', '8000'))
const processorBps = Number(get('MANIFEST_PROCESSOR_BPS', '1500'))
if (creatorBps < 0 || processorBps < 0 || creatorBps + processorBps > 10000) throw new Error('Manifest payout shares must total no more than 10000 bps')
const manifest = {
  chainId: 196,
  circuitId,
  name: get('MANIFEST_NAME', existing.name || 'Circuit Commons Pod Controller'),
  version: get('MANIFEST_VERSION', existing.version || '1.0.0'),
  processor: get('VITE_TAPEOUT_PROCESSOR_ADDRESS'),
  inputSchema: get('MANIFEST_INPUT_SCHEMA', existing.inputSchema || 'bytes'),
  outputSchema: get('MANIFEST_OUTPUT_SCHEMA', existing.outputSchema || 'bytes'),
  price: get('MANIFEST_PRICE', existing.price || '0.0001'),
  creatorBps,
  processorBps,
  commonsBps: 10000 - creatorBps - processorBps,
}
// Keep the byte representation identical to the frontend publisher's
// JSON.stringify(..., null, 2) output so the uploaded file hashes exactly.
const canonical = JSON.stringify(manifest, null, 2)
const hash = keccak256(stringToHex(canonical))
const outputDir = path.join(process.cwd(), 'outputs')
fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(path.join(outputDir, 'manifest.json'), canonical)
fs.writeFileSync(path.join(outputDir, 'manifest-deployment.json'), `${JSON.stringify({ manifest, manifestHash: hash, note: 'Upload manifest.json to immutable storage and use the exact URI when publishing.' }, null, 2)}\n`)
console.log(`Manifest written to outputs/manifest.json`)
console.log(`Manifest hash (keccak256): ${hash}`)
