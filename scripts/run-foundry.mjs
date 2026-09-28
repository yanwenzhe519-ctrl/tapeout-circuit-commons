import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const lookup = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['forge'], { stdio: 'ignore' })
if (lookup.status !== 0) {
  console.error('Foundry is required. Install it from https://getfoundry.sh/ and run: forge install foundry-rs/forge-std --no-commit')
  process.exit(1)
}
const result = spawnSync('forge', args, { stdio: 'inherit' })
process.exit(result.status ?? 1)
