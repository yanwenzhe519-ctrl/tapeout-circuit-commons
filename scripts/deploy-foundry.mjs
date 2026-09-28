import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const mode = process.argv[2] || 'deploy'
const envFile = fs.existsSync('.env.deploy') ? fs.readFileSync('.env.deploy', 'utf8') : ''
const fileEnv = Object.fromEntries(envFile.split(/\r?\n/).filter((line) => line && !line.startsWith('#') && line.includes('=')).map((line) => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim()] }))
const get = (key) => process.env[key] || fileEnv[key] || ''
const rpc = get('XLAYER_RPC_URL') || 'https://rpc.xlayer.tech'
const privateKey = get('PRIVATE_KEY')
if (!privateKey) {
  console.error('PRIVATE_KEY is required only for this local broadcast command. Prefer a hardware-wallet/account flow for production.')
  process.exit(1)
}
const target = mode === 'configure' ? 'script/Configure.s.sol:ConfigureScript' : 'script/Deploy.s.sol:DeployScript'
const lookup = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['forge'], { stdio: 'ignore' })
if (lookup.status !== 0) {
  console.error('Foundry is required. Install it from https://getfoundry.sh/')
  process.exit(1)
}
const result = spawnSync('forge', ['script', target, '--rpc-url', rpc, '--broadcast', '--private-key', privateKey], { encoding: 'utf8' })
process.stdout.write(result.stdout || '')
process.stderr.write(result.stderr || '')
if (mode === 'deploy' && result.status === 0) {
  const output = {}
  for (const line of `${result.stdout || ''}\n${result.stderr || ''}`.split(/\r?\n/)) {
    const match = line.match(/^(CircuitPodAccount|CircuitCommonsRegistry|CircuitCommonsRouter|CircuitPodFactory|CircuitRevenueVault)\s+(0x[a-fA-F0-9]{40})$/)
    if (match) output[match[1]] = match[2]
  }
  if (Object.keys(output).length) {
    fs.mkdirSync('outputs', { recursive: true })
    fs.writeFileSync('outputs/deployment.json', `${JSON.stringify(output, null, 2)}\n`)
    console.log('Saved outputs/deployment.json')
  }
}
process.exit(result.status ?? 1)
