import fs from 'node:fs'
import path from 'node:path'

const endpoint = process.env.TAPEOUT_PROCESSORS_URL || 'https://tapeout.work/api/v1/processors?page=1&page_size=8&sort=circuits'
const response = await fetch(endpoint, { signal: AbortSignal.timeout(20_000) })
if (!response.ok) throw new Error(`TapeOut processor API returned HTTP ${response.status}`)

const payload = await response.text()
JSON.parse(payload)
const outputDirectory = path.join(process.cwd(), 'public', 'data')
fs.mkdirSync(outputDirectory, { recursive: true })
fs.writeFileSync(path.join(outputDirectory, 'tapeout-processors.json'), `${payload.trim()}\n`)
console.log(`Wrote TapeOut processor snapshot to public/data/tapeout-processors.json`)
