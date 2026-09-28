import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const lookup = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['forge'], { stdio: 'ignore' })
if (lookup.status !== 0) {
  console.error('Foundry is required. Install it from https://getfoundry.sh/ and run: forge install foundry-rs/forge-std --no-commit')
  process.exit(1)
}
const result = spawnSync('forge', ['build', '--build-info'], { cwd: root, stdio: 'inherit' })
if (result.status !== 0) process.exit(result.status ?? 1)

const abiDir = path.join(root, 'outputs', 'abi')
const bytecodeDir = path.join(root, 'outputs', 'bytecode')
fs.mkdirSync(abiDir, { recursive: true })
fs.mkdirSync(bytecodeDir, { recursive: true })
const contracts = ['CircuitPodAccount', 'CircuitCommonsRegistry', 'CircuitCommonsRouter', 'CircuitPodFactory', 'CircuitRevenueVault']
for (const name of contracts) {
  const source = path.join(root, 'out', `${name}.sol`, `${name}.json`)
  if (!fs.existsSync(source)) throw new Error(`Missing Foundry artifact: ${source}`)
  const artifact = JSON.parse(fs.readFileSync(source, 'utf8'))
  fs.writeFileSync(path.join(abiDir, `${name}.abi.json`), `${JSON.stringify(artifact.abi, null, 2)}\n`)
  fs.writeFileSync(path.join(bytecodeDir, `${name}.bytecode.json`), `${JSON.stringify({ bytecode: artifact.bytecode, deployedBytecode: artifact.deployedBytecode }, null, 2)}\n`)
}
console.log(`Exported ${contracts.length} ABIs to ${path.relative(root, abiDir)}`)
