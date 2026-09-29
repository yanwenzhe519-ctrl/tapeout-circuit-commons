import fs from 'node:fs'
import path from 'node:path'
import { encodeAbiParameters, getCreate2Address, keccak256, stringToHex } from 'viem'

const env = Object.fromEntries(fs.readFileSync('.env.deploy', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#') && line.includes('='))
  .map((line) => { const index = line.indexOf('='); return [line.slice(0, index).trim(), line.slice(index + 1).trim()] }))
const required = ['TAPEOUT_OWNERSHIP_ADAPTER', 'TAPEOUT_PROCESSOR', 'TAPEOUT_CONTAINER_ADAPTER', 'PROCESSOR_RECIPIENT', 'COMMONS_RECIPIENT']
for (const key of required) if (!env[key]) throw new Error(key + ' is required in .env.deploy')

const singletonFactory = '0xce0042B868300000d44A59004Da54A005ffdcf9f'
const artifact = (name) => JSON.parse(fs.readFileSync(path.join('outputs', 'bytecode', name + '.bytecode.json'), 'utf8')).bytecode.object
const predict = (bytecode, args, label) => {
  const initCode = bytecode + args.slice(2)
  const salt = keccak256(stringToHex('circuit-commons:' + env.PROCESSOR_RECIPIENT.toLowerCase() + ':' + label))
  return getCreate2Address({ from: singletonFactory, salt, bytecode: initCode })
}

const registry = predict(artifact('CircuitCommonsRegistry'), encodeAbiParameters([{ type: 'address' }, { type: 'address' }], [env.TAPEOUT_OWNERSHIP_ADAPTER, env.PROCESSOR_RECIPIENT]), 'Registry 部署')
const router = predict(artifact('CircuitCommonsRouter'), encodeAbiParameters([{ type: 'address' }, { type: 'address' }, { type: 'address' }, { type: 'address' }], [registry, env.TAPEOUT_PROCESSOR, env.PROCESSOR_RECIPIENT, env.COMMONS_RECIPIENT]), 'Router 部署')
const factory = predict(artifact('CircuitPodFactory'), encodeAbiParameters([{ type: 'address' }, { type: 'address' }, { type: 'address' }, { type: 'address' }], [env.TAPEOUT_OWNERSHIP_ADAPTER, registry, env.TAPEOUT_CONTAINER_ADAPTER, env.TAPEOUT_PROCESSOR]), 'Factory 部署')

const plan = { network: 'X Layer', chainId: 196, deployer: env.PROCESSOR_RECIPIENT, singletonFactory, registry, router, factory }
fs.mkdirSync('outputs', { recursive: true })
fs.writeFileSync('outputs/browser-deployment-plan.json', JSON.stringify(plan, null, 2) + '\n')
console.log(JSON.stringify(plan, null, 2))
