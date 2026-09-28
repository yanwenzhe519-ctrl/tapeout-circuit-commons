import fs from 'node:fs'
import process from 'node:process'

const source = process.argv[2] || 'outputs/deployment.json'
if (!fs.existsSync(source)) {
  console.error(`Deployment output not found: ${source}`)
  console.error('Run the deploy command first, then pass its JSON output to this script.')
  process.exit(1)
}

const deployment = JSON.parse(fs.readFileSync(source, 'utf8'))
let current = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : ''
const values = {
  VITE_POD_ACCOUNT_ADDRESS: deployment.CircuitPodAccount || deployment.podAccount,
  VITE_REGISTRY_ADDRESS: deployment.CircuitCommonsRegistry || deployment.registry,
  VITE_ROUTER_ADDRESS: deployment.CircuitCommonsRouter || deployment.router,
  VITE_FACTORY_ADDRESS: deployment.CircuitPodFactory || deployment.factory || '',
  VITE_REVENUE_VAULT_ADDRESS: deployment.CircuitRevenueVault || deployment.vault || '',
}
for (const [key, value] of Object.entries(values)) {
  if (!value) continue
  const line = `${key}=${value}`
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  if (pattern.test(current)) current = current.replace(pattern, line)
  else current += `${current.endsWith('\n') || !current ? '' : '\n'}${line}\n`
}
fs.writeFileSync('.env.local', current)
console.log(`Updated .env.local from ${source}. Review deployment blocks before rebuilding.`)
