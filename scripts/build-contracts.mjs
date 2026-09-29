import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import solc from 'solc'

const root = process.cwd()
const contracts = ['CircuitPodAccount', 'CircuitCommonsRegistry', 'CircuitCommonsRouter', 'CircuitPodFactory', 'CircuitRevenueVault']
const abiDir = path.join(root, 'outputs', 'abi')
const bytecodeDir = path.join(root, 'outputs', 'bytecode')
fs.mkdirSync(abiDir, { recursive: true })
fs.mkdirSync(bytecodeDir, { recursive: true })

const lookup = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['forge'], { stdio: 'ignore' })
let artifacts
if (lookup.status === 0) {
  const result = spawnSync('forge', ['build', '--build-info'], { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
  artifacts = Object.fromEntries(contracts.map((name) => {
    const source = path.join(root, 'out', name + '.sol', name + '.json')
    if (!fs.existsSync(source)) throw new Error('Missing Foundry artifact: ' + source)
    return [name, JSON.parse(fs.readFileSync(source, 'utf8'))]
  }))
} else {
  const contractDir = path.join(root, 'contracts')
  const sources = Object.fromEntries(fs.readdirSync(contractDir)
    .filter((name) => name.endsWith('.sol'))
    .map((name) => ['contracts/' + name, { content: fs.readFileSync(path.join(contractDir, name), 'utf8') }]))
  const output = JSON.parse(solc.compile(JSON.stringify({
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'] } },
    },
  })))
  const errors = (output.errors || []).filter((item) => item.severity === 'error')
  if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join('\n'))
  artifacts = Object.fromEntries(contracts.map((name) => {
    const artifact = output.contracts['contracts/' + name + '.sol']?.[name]
    if (!artifact) throw new Error('solc did not produce ' + name)
    const normalize = (value) => ({ object: value.object ? '0x' + value.object : '0x', sourceMap: value.sourceMap || '', linkReferences: value.linkReferences || {} })
    return [name, { abi: artifact.abi, bytecode: normalize(artifact.evm.bytecode), deployedBytecode: normalize(artifact.evm.deployedBytecode) }]
  }))
  console.log('forge not found; compiled production contracts with solc-js 0.8.24')
}

for (const name of contracts) {
  const artifact = artifacts[name]
  fs.writeFileSync(path.join(abiDir, name + '.abi.json'), JSON.stringify(artifact.abi, null, 2) + '\n')
  fs.writeFileSync(path.join(bytecodeDir, name + '.bytecode.json'), JSON.stringify({ bytecode: artifact.bytecode, deployedBytecode: artifact.deployedBytecode }, null, 2) + '\n')
}
console.log('Exported ' + contracts.length + ' ABIs to ' + path.relative(root, abiDir))
