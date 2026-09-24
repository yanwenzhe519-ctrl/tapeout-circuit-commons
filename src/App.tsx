import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, ArrowDownToLine, ArrowUpRight, Check, ChevronRight, CircleDollarSign, CircleHelp, Code2, Copy, ExternalLink, FileKey2, Gauge, Landmark, Layers3, LineChart, LoaderCircle, LockKeyhole, Menu, Network, Play, Plus, ReceiptText, Repeat2, Settings2, ShieldCheck, Sparkles, Timer, TrendingUp, Wallet, X } from 'lucide-react'
import { circuits, yieldVaults } from './data'
import { buildManifestJson, callVaultAction, connectWallet, depositToVault, liveCallsEnabled, publishCircuit, readPublishedCircuits, readUsageReceipts, readVaultPosition, runCircuit, shortAddress, switchToXLayer, XLAYER_CHAIN_ID, XLAYER_EXPLORER, routerAddress, registryAddress, revenueVaultAddress, tapeoutProcessorAddress, ownershipAdapterAddress } from './chain'
import type { CircuitManifest, Position, UsageReceipt, YieldVault } from './types'

type View = 'catalog' | 'vaults' | 'positions' | 'licenses' | 'receipts' | 'publish'

const navItems: { id: View; label: string; icon: typeof Layers3 }[] = [
  { id: 'catalog', label: 'Circuit catalog', icon: Layers3 },
  { id: 'vaults', label: 'Yield vaults', icon: Landmark },
  { id: 'positions', label: 'My positions', icon: LineChart },
  { id: 'licenses', label: 'My licenses', icon: FileKey2 },
  { id: 'receipts', label: 'Usage receipts', icon: ReceiptText },
  { id: 'publish', label: 'Publish circuit', icon: Plus }
]

function App() {
  const [view, setView] = useState<View>('catalog')
  const [selected, setSelected] = useState<CircuitManifest>(circuits[0])
  const [catalogCircuits, setCatalogCircuits] = useState<CircuitManifest[]>(circuits)
  const [catalogLive, setCatalogLive] = useState(false)
  const [selectedVault, setSelectedVault] = useState<YieldVault>(yieldVaults[0])
  const [account, setAccount] = useState('')
  const [chainId, setChainId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [livePositions, setLivePositions] = useState<Position[]>([])

  const networkReady = chainId === XLAYER_CHAIN_ID
  const configReady = Boolean(routerAddress && registryAddress && tapeoutProcessorAddress)
  const publishReady = Boolean(registryAddress && ownershipAdapterAddress && tapeoutProcessorAddress)
  const vaultReady = Boolean(revenueVaultAddress && routerAddress && networkReady)

  async function handleConnect() {
    setBusy(true); setMessage('')
    try {
      const result = await connectWallet()
      setAccount(result.address)
      setChainId(result.chainId)
      if (result.chainId !== XLAYER_CHAIN_ID) setMessage('Wallet connected. Switch to X Layer to run a circuit.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Wallet connection failed.') }
    finally { setBusy(false) }
  }

  async function handleSwitch() {
    setBusy(true); setMessage('')
    try { await switchToXLayer(); setChainId(XLAYER_CHAIN_ID); setMessage('X Layer is ready.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Network switch failed.') }
    finally { setBusy(false) }
  }

  async function handleRun(inputHex: string) {
    setBusy(true); setMessage('')
    try {
      if (!account) throw new Error('Connect your wallet before running a circuit.')
      if (!networkReady) throw new Error('Switch your wallet to X Layer first.')
      if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(inputHex)) throw new Error('Circuit input must be even-length hexadecimal bytes beginning with 0x.')
      const tx = await runCircuit(selected.circuitId, inputHex as `0x${string}`, selected.price)
      setMessage(`Transaction submitted: ${shortAddress(tx)}. Open the receipt view after confirmation.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Circuit execution failed.') }
    finally { setBusy(false) }
  }

  useEffect(() => {
    let cancelled = false
    if (view !== 'positions' || !account || !vaultReady) {
      setLivePositions([])
      return () => { cancelled = true }
    }
    readVaultPosition(account).then((position) => {
      if (!cancelled) setLivePositions(position ? [position] : [])
    }).catch(() => { if (!cancelled) setLivePositions([]) })
    return () => { cancelled = true }
  }, [account, view, vaultReady])

  useEffect(() => {
    if (!registryAddress) return
    let cancelled = false
    readPublishedCircuits().then((items) => {
      if (cancelled || items.length === 0) return
      setCatalogCircuits(items)
      setSelected(items[0])
      setCatalogLive(true)
    }).catch((error) => { if (!cancelled) setMessage(error instanceof Error ? error.message : 'Could not verify Registry manifests.') })
    return () => { cancelled = true }
  }, [])

  async function handleDeposit(amount: string) {
    setBusy(true); setMessage('')
    try {
      if (!account) throw new Error('Connect your wallet before depositing.')
      if (!networkReady) throw new Error('Switch your wallet to X Layer first.')
      const tx = await depositToVault(amount)
      setMessage(`Vault deposit submitted: ${shortAddress(tx)}. PT and YT mint after confirmation.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Vault deposit failed.') }
    finally { setBusy(false) }
  }

  async function handleVaultAction(action: 'claimYield' | 'redeemPT') {
    setBusy(true); setMessage('')
    try {
      if (!account) throw new Error('Connect your wallet before managing a position.')
      if (!networkReady) throw new Error('Switch your wallet to X Layer first.')
      const tx = await callVaultAction(action)
      setMessage(`${action === 'claimYield' ? 'YT claim' : 'PT redemption'} submitted: ${shortAddress(tx)}.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Vault action failed.') }
    finally { setBusy(false) }
  }

  async function handlePublish(input: Parameters<typeof publishCircuit>[0]) {
    setBusy(true); setMessage('')
    try {
      if (!account) throw new Error('Connect the TapeOut circuit owner wallet first.')
      const result = await publishCircuit(input, account)
      const blob = new Blob([result.manifestJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `circuit-${input.circuitId}-manifest.json`
      link.click()
      URL.revokeObjectURL(url)
      setMessage(`Manifest submitted (${result.manifestHash.slice(0, 10)}…). Transaction: ${shortAddress(result.txHash)}. JSON downloaded for verification.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Manifest publish failed.') }
    finally { setBusy(false) }
  }

  const selectView = (next: View) => { setView(next); setMobileNav(false) }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span /><span /><span /><span /></div>
          <div><strong>CIRCUIT<br />COMMONS</strong><small>TAPEOUT / X LAYER</small></div>
        </div>
        <div className="sidebar-label">Workspace</div>
        <nav className="primary-nav" aria-label="Workspace navigation">
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => selectView(id)}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></button>)}
        </nav>
        <div className="sidebar-rule" />
        <div className="sidebar-label">Reference</div>
        <a className="nav-item link-item" href="https://www.oklink.com/xlayer" target="_blank" rel="noreferrer"><Network size={17} strokeWidth={1.8} /><span>X Layer explorer</span><ExternalLink size={13} /></a>
        <a className="nav-item link-item" href="https://tapeout.link/" target="_blank" rel="noreferrer"><Code2 size={17} strokeWidth={1.8} /><span>TapeOut ecosystem</span><ExternalLink size={13} /></a>
        <div className="sidebar-bottom"><div className="security-note"><ShieldCheck size={16} /><div><b>Pull-payment escrow</b><small>Recipients withdraw Router balances themselves.</small></div></div><div className="version-line"><span>v0.1.0</span><span>Pre-deployment</span></div></div>
      </aside>
      {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <main className="main-shell">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{navItems.find((item) => item.id === view)?.label}</b></div>
          <div className="top-actions">
            <div className={`network-pill ${networkReady ? 'ready' : ''}`}><span className="network-dot" />{networkReady ? 'X Layer' : 'Network not set'}</div>
            {account ? <button className="wallet-chip" onClick={handleConnect}><span className="wallet-dot" />{shortAddress(account)}</button> : <button className="connect-button" onClick={handleConnect} disabled={busy}><Wallet size={16} />{busy ? 'Connecting...' : 'Connect wallet'}</button>}
          </div>
        </header>
        <div className="content-wrap">
          {message && <div className="toast" role="status"><Activity size={16} /><span>{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss message"><X size={15} /></button></div>}
          {view === 'catalog' && <Catalog circuits={catalogCircuits} catalogLive={catalogLive} selected={selected} onSelect={setSelected} onRun={handleRun} onSwitch={handleSwitch} onConnect={handleConnect} account={account} networkReady={networkReady} configReady={configReady && liveCallsEnabled} busy={busy} />}
          {view === 'vaults' && <Vaults selected={selectedVault} onSelect={setSelectedVault} account={account} networkReady={networkReady} vaultReady={vaultReady} busy={busy} onDeposit={handleDeposit} onSwitch={handleSwitch} />}
          {view === 'positions' && <Positions account={account} positions={livePositions} onConnect={handleConnect} onClaim={() => handleVaultAction('claimYield')} onRedeem={() => handleVaultAction('redeemPT')} busy={busy} vaultReady={vaultReady} />}
          {view === 'licenses' && <Licenses account={account} onConnect={handleConnect} />}
          {view === 'receipts' && <Receipts />}
          {view === 'publish' && <Publish account={account} onConnect={handleConnect} configReady={publishReady} busy={busy} onPublish={handlePublish} />}
        </div>
      </main>
    </div>
  )
}

function Catalog({ circuits: rows, catalogLive, selected, onSelect, onRun, onSwitch, onConnect, account, networkReady, configReady, busy }: { circuits: CircuitManifest[]; catalogLive: boolean; selected: CircuitManifest; onSelect: (c: CircuitManifest) => void; onRun: (inputHex: string) => void; onSwitch: () => void; onConnect: () => void; account: string; networkReady: boolean; configReady: boolean; busy: boolean }) {
  return <>
    <section className="page-heading"><div><div className="status-kicker"><span className={`state-dot ${catalogLive ? 'live' : 'draft'}`} />{catalogLive ? `${rows.length} verified Registry manifests` : 'Preview catalog · execution disabled'}</div><h1>TapeOut circuits<br /><i>for X Layer.</i></h1><p>License deterministic circuit calls in OKB, issue verifiable usage receipts, and route creator revenue into transparent claims.</p></div><div className="heading-actions"><a className="text-action" href="https://tapeout.link/" target="_blank" rel="noreferrer">Explore TapeOut <ArrowUpRight size={15} /></a><button className="outline-button" onClick={() => document.getElementById('catalog-list')?.scrollIntoView({ behavior: 'smooth' })}><span>Browse catalog</span><ChevronRight size={15} /></button></div></section>
    <section className="status-strip"><div className="strip-item"><div className="strip-icon blue"><Network size={17} /></div><div><small>Execution network</small><b>X Layer · chain 196</b></div></div><div className="strip-item"><div className="strip-icon green"><Gauge size={17} /></div><div><small>Verified manifests</small><b>{catalogLive ? rows.length : 'Not indexed'}</b></div></div><div className="strip-item"><div className="strip-icon amber"><LockKeyhole size={17} /></div><div><small>Settlement asset</small><b>OKB / non-custodial</b></div></div><div className="strip-note">{catalogLive ? <><Check size={15} />Content hashes match Registry</> : <><AlertTriangle size={15} />Preview rows are not deployed circuits</>}</div></section>
    <div className="section-bar" id="catalog-list"><div><h2>{catalogLive ? 'Verified catalog' : 'Preview circuits'}</h2><span>{catalogLive ? 'Fetched from Registry events and hash-checked' : 'Example manifests · connect the deployed Registry to list real circuits'}</span></div><div className="filter-row"><span className="hash-label">{catalogLive ? `${rows.length} deployed` : '0 deployed'}</span></div></div>
    <section className="workspace-grid"><div className="circuit-list">{rows.map((c) => <CircuitRow key={c.id} circuit={c} selected={selected.id === c.id} onClick={() => onSelect(c)} />)}</div><CircuitDetail circuit={selected} catalogLive={catalogLive} onRun={onRun} onSwitch={onSwitch} onConnect={onConnect} account={account} networkReady={networkReady} configReady={configReady} busy={busy} /></section>
  </>
}

function CircuitRow({ circuit, selected, onClick }: { circuit: CircuitManifest; selected: boolean; onClick: () => void }) {
  return <button className={`circuit-row ${selected ? 'selected' : ''}`} onClick={onClick}><span className={`circuit-glyph ${circuit.accent}`}>{circuit.glyph}</span><span className="circuit-main"><b>{circuit.name}</b><small>{circuit.description}</small><span className="row-meta"><span className={`state-dot ${circuit.status}`} />{circuit.status === 'live' ? 'Live' : 'Draft'} · v{circuit.version}</span></span><span className="row-price"><b>{circuit.price}</b><small>OKB / call</small></span><ChevronRight size={17} className="row-chevron" /></button>
}

function CircuitDetail({ circuit, catalogLive, onRun, onSwitch, onConnect, account, networkReady, configReady, busy }: { circuit: CircuitManifest; catalogLive: boolean; onRun: (inputHex: string) => void; onSwitch: () => void; onConnect: () => void; account: string; networkReady: boolean; configReady: boolean; busy: boolean }) {
  const [inputHex, setInputHex] = useState('0x')
  const validInput = /^0x(?:[0-9a-fA-F]{2})*$/.test(inputHex)
  const callReady = Boolean(catalogLive && account && networkReady && configReady && circuit.status === 'live' && validInput)
  return <section className="detail-panel"><div className="detail-top"><div className={`detail-glyph ${circuit.accent}`}>{circuit.glyph}</div><div><div className="detail-label">{catalogLive ? 'Verified circuit' : 'Preview circuit'} <span className={catalogLive ? 'live-tag' : 'pending-tag'}>{catalogLive ? 'on-chain' : 'not deployed'}</span></div><h2>{circuit.name}</h2><p>{circuit.description}</p></div><button className="icon-button" aria-label="Copy circuit ID" title="Copy circuit ID" onClick={() => navigator.clipboard?.writeText(circuit.circuitId.toString())}><Copy size={16} /></button></div><div className="detail-block"><div className="block-heading"><span>{catalogLive ? 'License manifest' : 'Example manifest'}</span><span className="hash-label">{catalogLive ? 'hash verified' : 'not on-chain'}</span></div><div className="manifest-grid"><div><small>Processor</small><b>{circuit.processor}</b></div><div><small>Circuit ID</small><b>#{circuit.circuitId.toString().padStart(4, '0')}</b></div><div><small>Version</small><b>{circuit.version}</b></div><div><small>Confirmed calls</small><b>{circuit.calls}</b></div></div><div className="schema-line"><span><small>INPUT</small><code>{circuit.inputSchema}</code></span><ChevronRight size={15} /><span><small>OUTPUT</small><code>{circuit.outputSchema}</code></span></div></div><div className="detail-block economics"><div className="block-heading"><span>{catalogLive ? 'Economics per call' : 'Example split'}</span><span className="okb-price">{catalogLive ? `${circuit.price} OKB` : 'not deployed'}</span></div><div className="split-bar"><span style={{ width: `${circuit.creatorShare}%` }} /><span style={{ width: `${circuit.processorShare}%` }} /><span style={{ width: `${circuit.commonsShare}%` }} /></div><div className="split-legend"><span><i className="legend creator" />Creator <b>{circuit.creatorShare}%</b></span><span><i className="legend processor" />Processor <b>{circuit.processorShare}%</b></span><span><i className="legend commons" />Commons <b>{circuit.commonsShare}%</b></span></div></div><div className="run-box"><div><span className="run-eyebrow"><LockKeyhole size={14} />{catalogLive ? 'Signed circuit call' : 'Live calls unavailable'}</span><p>{catalogLive ? 'Encode inputs according to the verified manifest schema.' : 'Execution stays disabled until the deployed TapeOut Processor ABI and real input schema are verified.'}</p>{catalogLive && <label className="deposit-field">Input bytes<input value={inputHex} onChange={(event) => setInputHex(event.target.value)} spellCheck={false} aria-invalid={!validInput} /><span>hex</span></label>}</div>{!catalogLive ? <button className="primary-button disabled" disabled><Settings2 size={16} />Not configured for live calls</button> : !account ? <button className="primary-button" onClick={onConnect}><Wallet size={16} />Connect wallet</button> : !networkReady ? <button className="primary-button" onClick={onSwitch}><Network size={16} />Switch to X Layer</button> : !configReady ? <button className="primary-button disabled" disabled><Settings2 size={16} />Live calls not enabled</button> : <button className="primary-button" onClick={() => onRun(inputHex)} disabled={!callReady || busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />}{busy ? 'Submitting…' : `Run for ${circuit.price} OKB`}</button>}</div><div className="detail-footer"><span><ShieldCheck size={14} />{catalogLive ? 'Exact-price Router call' : 'No example row can spend funds'}</span><a href={XLAYER_EXPLORER} target="_blank" rel="noreferrer">View X Layer <ExternalLink size={13} /></a></div></section>
}

function Vaults({ selected, onSelect, account, networkReady, vaultReady, busy, onDeposit, onSwitch }: { selected: YieldVault; onSelect: (vault: YieldVault) => void; account: string; networkReady: boolean; vaultReady: boolean; busy: boolean; onDeposit: (amount: string) => void; onSwitch: () => void }) {
  return <>
    <section className="page-heading compact"><div><div className="status-kicker"><Landmark size={14} />Preview vaults · none deployed</div><h1>Yield <i>vaults.</i></h1><p>Separate principal from future Circuit usage revenue. PT and YT are claims on a fixed X Layer vault, never a guaranteed APY.</p></div><a className="outline-button as-link" href={XLAYER_EXPLORER} target="_blank" rel="noreferrer">Verify on X Layer <ExternalLink size={15} /></a></section>
    <section className="defi-strip"><div className="defi-strip-main"><div className="strip-icon green"><TrendingUp size={17} /></div><div><small>Revenue source after deployment</small><b>Router creator share from paid calls</b></div></div><div className="defi-strip-item"><small>Deployed vaults</small><b>0</b></div><div className="defi-strip-item"><small>Protocol token</small><b>None</b></div><div className="defi-strip-note"><ShieldCheck size={15} />No fixed yield promise</div></section>
    <div className="vault-layout"><div className="vault-list">{yieldVaults.map((vault) => <VaultRow key={vault.id} vault={vault} selected={selected.id === vault.id} onClick={() => onSelect(vault)} />)}</div><VaultDetail vault={selected} account={account} networkReady={networkReady} vaultReady={vaultReady} busy={busy} onDeposit={onDeposit} onSwitch={onSwitch} /></div>
  </>
}

function VaultRow({ vault, selected, onClick }: { vault: YieldVault; selected: boolean; onClick: () => void }) {
  return <button className={`vault-row ${selected ? 'selected' : ''}`} onClick={onClick}><span className={`vault-glyph ${vault.accent}`}><CircleDollarSign size={18} /></span><span className="vault-row-main"><b>{vault.circuit} · {vault.daysLeft}d</b><small>{vault.description}</small><span className="row-meta"><span className={`state-dot ${vault.status === 'live' ? 'live' : ''}`} />{vault.status === 'pending' ? 'Awaiting deployment' : vault.status} · v{vault.manifestVersion}</span></span><span className="vault-row-price"><b>{vault.ptPrice} OKB</b><small>PT indicative</small></span><ChevronRight size={17} className="row-chevron" /></button>
}

function VaultDetail({ vault, account, networkReady, vaultReady, busy, onDeposit, onSwitch }: { vault: YieldVault; account: string; networkReady: boolean; vaultReady: boolean; busy: boolean; onDeposit: (amount: string) => void; onSwitch: () => void }) {
  const [amount, setAmount] = useState('0.01')
  const canDeposit = Boolean(account && networkReady && vaultReady && vault.status === 'live')
  return <section className="detail-panel vault-detail"><div className="detail-top"><div className={`detail-glyph ${vault.accent}`}><Landmark size={20} /></div><div><div className="detail-label">Revenue vault <span className="pending-tag">{vault.status === 'pending' ? 'pending deployment' : vault.status}</span></div><h2>{vault.circuit} / {vault.daysLeft} days</h2><p>{vault.description}</p></div><button className="icon-button" aria-label="Copy vault address" title="Copy vault address" onClick={() => vault.vaultAddress && navigator.clipboard?.writeText(vault.vaultAddress)}><Copy size={16} /></button></div><div className="detail-block"><div className="block-heading"><span>Cashflow facts</span><span className="hash-label">realized only</span></div><div className="vault-facts"><div><small>30d revenue</small><b>{vault.realized30d} OKB</b></div><div><small>7d revenue</small><b>{vault.realized7d} OKB</b></div><div><small>30d calls</small><b>{vault.calls30d.toLocaleString()}</b></div><div><small>TVL / cap</small><b>{vault.tvl} / {vault.cap} OKB</b></div></div><div className="revenue-chart" aria-label="Realized revenue history"><span style={{ height: '25%' }} /><span style={{ height: '36%' }} /><span style={{ height: '31%' }} /><span style={{ height: '49%' }} /><span style={{ height: '41%' }} /><span style={{ height: '61%' }} /><span style={{ height: '55%' }} /><span style={{ height: '75%' }} /></div><small className="chart-caption"><LineChart size={13} />Revenue chart activates after the first verified UsageReceipt.</small></div><div className="detail-block economics"><div className="block-heading"><span>Two claims, one source</span><span className="okb-price">no protocol token</span></div><div className="ptyt-grid"><div><span className="asset-label pt">PT</span><b>Principal token</b><small>Redeemable at maturity under vault rules.</small></div><div><span className="asset-label yt">YT</span><b>Yield token</b><small>Claims only actual creator revenue during the term.</small></div></div></div><div className="run-box"><div><span className="run-eyebrow"><Repeat2 size={14} /> Deposit and mint</span><p>Enter an amount in OKB. The deployed Vault enforces its cap and maturity on-chain.</p><label className="deposit-field">Amount<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" pattern="[0-9.]*" disabled={!vaultReady || busy} /><span>OKB</span></label></div>{!account ? <button className="primary-button" onClick={() => onDeposit(amount)}><Wallet size={16} />Connect to deposit</button> : !networkReady ? <button className="primary-button" onClick={onSwitch}><Network size={16} />Switch to X Layer</button> : !vaultReady ? <button className="primary-button disabled" disabled><Settings2 size={16} />Vault awaiting deployment</button> : <button className="primary-button" onClick={() => onDeposit(amount)} disabled={busy || !canDeposit || Number(amount) <= 0}>{busy ? <LoaderCircle size={16} className="spin" /> : <ArrowDownToLine size={16} />}{busy ? 'Submitting...' : 'Deposit and mint'}</button>}</div><div className="detail-footer"><span><ShieldCheck size={14} />Revenue is not guaranteed</span><a href={XLAYER_EXPLORER} target="_blank" rel="noreferrer">View chain <ExternalLink size={13} /></a></div></section>
}

function Positions({ account, positions, onConnect, onClaim, onRedeem, busy, vaultReady }: { account: string; positions: Position[]; onConnect: () => void; onClaim: () => void; onRedeem: () => void; busy: boolean; vaultReady: boolean }) {
  return <><section className="page-heading compact"><div><div className="status-kicker"><LineChart size={14} />Your on-chain claims</div><h1>My <i>positions.</i></h1><p>PT is principal at maturity. YT is variable revenue from verified Circuit calls. Both remain empty until a wallet signs a real vault deposit.</p></div>{!account && <button className="primary-button" onClick={onConnect}><Wallet size={16} />Connect wallet</button>}</section>{positions.length === 0 ? <section className="empty-state position-empty"><div className="empty-icon"><LineChart size={22} /></div><h2>{account ? 'No positions in this wallet yet' : 'Connect to see positions'}</h2><p>{account ? 'Open Yield vaults and deposit into a configured X Layer vault. Fixture balances are never shown as holdings.' : 'Your address is only used to read balances and sign vault transactions.'}</p>{!account && <button className="outline-button" onClick={onConnect}>Connect wallet <Wallet size={15} /></button>}</section> : <section className="position-table">{positions.map((position) => <div className="position-row" key={position.vault}><div><small>Vault</small><b>{position.vault}</b></div><div><small>PT balance</small><strong>{position.pt} PT</strong></div><div><small>YT balance</small><strong>{position.yt} YT</strong></div><div><small>Claimable</small><strong>{position.claimable} OKB</strong></div><div className="position-actions"><button className="outline-button" onClick={onClaim} disabled={busy || !vaultReady}><CircleDollarSign size={14} />Claim YT</button><button className="outline-button" onClick={onRedeem} disabled={busy || !vaultReady}><Timer size={14} />Redeem PT</button></div></div>)}</section>}{account && <div className="receipt-note"><AlertTriangle size={17} /><p><b>Position accounting is conservative.</b> The app will only show balances read from the deployed Vault. It will never infer deposits from a submitted transaction.</p></div>}</>
}

function Licenses({ account, onConnect }: { account: string; onConnect: () => void }) {
  return <><section className="page-heading compact"><div><div className="status-kicker"><FileKey2 size={14} />Ownership and permissions</div><h1>My <i>licenses.</i></h1><p>Licenses are version-pinned permissions to call a Circuit. They never custody your funds.</p></div>{!account && <button className="primary-button" onClick={onConnect}><Wallet size={16} />Connect wallet</button>}</section><section className="empty-state"><div className="empty-icon"><FileKey2 size={22} /></div><h2>{account ? 'No licenses in this wallet yet' : 'Connect to see your licenses'}</h2><p>{account ? 'Browse the catalog and run a licensed Circuit to create your first usage receipt.' : 'Your wallet address is only used to read ownership and sign calls.'}</p>{account ? <button className="outline-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Browse catalog <ChevronRight size={15} /></button> : <button className="outline-button" onClick={onConnect}>Connect wallet <Wallet size={15} /></button>}</section></>
}

function Receipts() {
  const [rows, setRows] = useState<UsageReceipt[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'unconfigured'>('loading')
  useEffect(() => {
    if (!routerAddress) { setRows([]); setState('unconfigured'); return }
    let cancelled = false
    readUsageReceipts().then((items) => { if (!cancelled) { setRows(items); setState('ready') } }).catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [])
  return <><section className="page-heading compact"><div><div className="status-kicker"><ReceiptText size={14} />Auditable execution history</div><h1>Usage <i>receipts.</i></h1><p>Receipts are read from Router logs on X Layer. Only confirmed on-chain events are listed.</p></div><a className="outline-button as-link" href={XLAYER_EXPLORER} target="_blank" rel="noreferrer">Open explorer <ExternalLink size={15} /></a></section>{state === 'error' ? <section className="empty-state"><h2>Could not load Router events</h2><p>Check the RPC endpoint and deployment block, then reload this page.</p></section> : state === 'loading' ? <section className="empty-state"><LoaderCircle className="spin" size={22} /><h2>Reading X Layer</h2><p>Querying the configured Router for confirmed UsageReceipt events.</p></section> : state === 'unconfigured' || rows.length === 0 ? <section className="empty-state"><div className="empty-icon"><ReceiptText size={22} /></div><h2>{state === 'unconfigured' ? 'Router not deployed' : 'No confirmed calls yet'}</h2><p>{state === 'unconfigured' ? 'Configure the X Layer Router address to read receipts. No sample transactions are shown as live activity.' : 'The configured Router has not emitted a UsageReceipt in the indexed range.'}</p></section> : <section className="receipt-table"><div className="table-head"><span>Receipt</span><span>Circuit</span><span>Amount</span><span>Time</span><span>Transaction</span><span>Status</span></div>{rows.map((r) => <div className="table-row" key={r.id + r.txHash}><b>{r.id}</b><strong>{r.circuit}</strong><span>{r.amount}</span><span>{r.timestamp}</span><a href={`${XLAYER_EXPLORER}/tx/${r.txHash}`} target="_blank" rel="noreferrer">{shortAddress(r.txHash)}<ExternalLink size={12} /></a><span className="confirmed"><Check size={13} />Confirmed</span></div>)}</section>}<div className="receipt-note"><ShieldCheck size={17} /><p><b>On-chain facts only.</b> The Router event contains the circuit, caller, amount, commitments and payout recipients; transaction links open in the X Layer explorer.</p></div></>
}

function Publish({ account, onConnect, configReady, busy, onPublish }: { account: string; onConnect: () => void; configReady: boolean; busy: boolean; onPublish: (input: Parameters<typeof publishCircuit>[0]) => void }) {
  const [circuitId, setCircuitId] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [inputSchema, setInputSchema] = useState('')
  const [outputSchema, setOutputSchema] = useState('')
  const [manifestURI, setManifestURI] = useState('')
  const [creatorBps, setCreatorBps] = useState('8000')
  const [processorBps, setProcessorBps] = useState('1500')
  const splitValid = Number(creatorBps) >= 0 && Number(processorBps) >= 0 && Number(creatorBps) + Number(processorBps) <= 10000
  const draft = { circuitId, name, version, inputSchema, outputSchema, manifestURI, price, creatorBps: Number(creatorBps), processorBps: Number(processorBps) }
  const draftReady = /^\d+$/.test(circuitId) && name.trim().length > 0 && version.trim().length > 0 && inputSchema.trim().length > 0 && outputSchema.trim().length > 0 && Number(price) > 0 && splitValid
  const valid = draftReady && /^(ipfs:\/\/|https:\/\/).+/.test(manifestURI.trim())
  const downloadManifest = () => {
    const blob = new Blob([buildManifestJson(draft)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = `circuit-${circuitId || 'draft'}-manifest.json`; link.click(); URL.revokeObjectURL(url)
  }
  return <><section className="page-heading compact"><div><div className="status-kicker"><Plus size={14} />Creator workspace</div><h1>Publish a <i>circuit.</i></h1><p>Bind TapeOut circuit ownership to a versioned OKB license and payout split on X Layer.</p></div>{!account && <button className="primary-button" onClick={onConnect}><Wallet size={16} />Connect wallet</button>}</section><section className="publish-layout"><form className="publish-form" onSubmit={(event) => { event.preventDefault(); if (valid) onPublish(draft) }}><div className="form-title"><h2>License manifest</h2><span>Export → host → publish</span></div><label>Circuit ID<input required min="0" pattern="[0-9]+" value={circuitId} onChange={(event) => setCircuitId(event.target.value)} inputMode="numeric" disabled={!account || busy} /></label><label>Manifest name<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} disabled={!account || busy} /></label><div className="form-two"><label>Price / call<input required type="number" min="0.000000000000000001" step="any" value={price} onChange={(event) => setPrice(event.target.value)} disabled={!account || busy} /><small>OKB</small></label><label>Version<input required maxLength={32} value={version} onChange={(event) => setVersion(event.target.value)} disabled={!account || busy} /></label></div><label>Input schema<textarea required maxLength={1000} value={inputSchema} onChange={(event) => setInputSchema(event.target.value)} rows={3} disabled={!account || busy} /></label><label>Output schema<textarea required maxLength={1000} value={outputSchema} onChange={(event) => setOutputSchema(event.target.value)} rows={3} disabled={!account || busy} /></label><div className="form-two"><label>Creator share (bps)<input required type="number" min="0" max="10000" step="1" value={creatorBps} onChange={(event) => setCreatorBps(event.target.value)} disabled={!account || busy} /></label><label>Processor share (bps)<input required type="number" min="0" max="10000" step="1" value={processorBps} onChange={(event) => setProcessorBps(event.target.value)} disabled={!account || busy} /></label></div>{!splitValid && <small role="alert">Creator and Processor shares cannot exceed 100%. Remaining share goes to Commons.</small>}<button className="outline-button full" type="button" onClick={downloadManifest} disabled={!draftReady || busy}><ArrowDownToLine size={16} />1. Export canonical JSON</button><label>Manifest URI<input required type="text" inputMode="url" placeholder="ipfs://CID or https://…" value={manifestURI} onChange={(event) => setManifestURI(event.target.value)} disabled={!account || busy} /><small>2. Upload the unchanged JSON, then paste its immutable URI.</small></label><button className="primary-button full" type="submit" disabled={!account || !configReady || !valid || busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <LockKeyhole size={16} />}{busy ? 'Check wallet…' : !account ? 'Connect circuit owner wallet' : !configReady ? 'Deployment config required' : '3. Verify owner & publish'}</button></form><aside className="publish-aside"><div className="aside-icon"><CircleHelp size={18} /></div><h3>What gets published?</h3><p>The app hashes the exact canonical JSON and writes its hash, immutable content URI, price and split to the Registry. Catalog readers reject content that no longer matches.</p><ul><li><Check size={14} />TapeOut owner preflight</li><li><Check size={14} />Processor and Circuit ID</li><li><Check size={14} />Fixed OKB price and split</li><li><Check size={14} />Independently verifiable JSON</li></ul></aside></section></>
}

export default App
