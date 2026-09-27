import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Box,
  Check,
  ChevronRight,
  CircleDollarSign,
  Code2,
  Copy,
  ExternalLink,
  FileKey2,
  Gauge,
  GitBranch,
  Globe2,
  Layers3,
  Landmark,
  LineChart,
  LoaderCircle,
  Menu,
  Network,
  PackageOpen,
  Play,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import {
  connectWallet,
  createPodOnChain,
  adminWalletAddress,
  depositToVault,
  liveCallsEnabled,
  openTapeoutContainer,
  publishCircuit,
  readTapeoutContainer,
  readCircuitOwner,
  readFactoryPod,
  readDeploymentChecks,
  deployProtocolFromWallet,
  readPublishedCircuits,
  readUsageReceipts,
  readVaultPosition,
  runCircuit,
  shortAddress,
  switchToXLayer,
  waitForTransaction,
  XLAYER_CHAIN_ID,
  XLAYER_EXPLORER,
  routerAddress,
  factoryAddress,
  registryAddress,
  processorRecipientAddress,
  podAccountAddress,
  revenueVaultAddress,
  tapeoutProcessorAddress,
  ownershipAdapterAddress,
  containerAdapterAddress,
  tapeoutContainerAddress,
} from "./chain";
import { keccak256, stringToHex } from "viem";
import type { CircuitManifest, Position, UsageReceipt } from "./types";

type View =
  | "overview"
  | "pods"
  | "registry"
  | "vaults"
  | "ecosystem"
  | "developers"
  | "activity"
  | "publish"
  | "admin";
type Language = "en" | "zh";
type Processor = {
  address: string;
  name: string;
  creator: string;
  minted: string;
  supplyCap: string;
  mintPrice: string;
  circuitCount: number;
};
type EcosystemItem = {
  name: string;
  category: string;
  description: string;
  url: string;
  live: boolean;
  accent: string;
};

const nav: { id: View; label: string; icon: typeof Layers3 }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "pods", label: "Circuit Pods", icon: PackageOpen },
  { id: "registry", label: "Circuit registry", icon: Layers3 },
  { id: "vaults", label: "Settlement flows", icon: Landmark },
  { id: "ecosystem", label: "TapeOut ecosystem", icon: Globe2 },
  { id: "developers", label: "Developer kit", icon: Code2 },
  { id: "activity", label: "On-chain activity", icon: Activity },
  { id: "publish", label: "Publish circuit", icon: Plus },
  { id: "admin", label: "Launch admin", icon: Settings2 },
];
const LanguageContext = createContext<Language>("en");
const useLanguage = () => useContext(LanguageContext);
const text = {
  en: {
    workspace: "Workspace",
    external: "External tools",
    protocol: "TapeOut Protocol",
    intelligence: "Public intelligence",
    toolkit: "TapeKit DeWeb",
    nonCustody: "Non-custodial by design",
    signedOnly: "Only signed X Layer transactions move funds.",
    configured: "Configured",
    predeployment: "Pre-deployment",
    connectX: "Connect X Layer",
    connect: "Connect wallet",
    connecting: "Connecting…",
    dataConnected: "TapeOut public data connected",
    syncing: "Syncing public data",
    dataUnavailable: "Data API unavailable",
    make: "Move a live Circuit",
    productive: "without moving its state.",
    hero: "Circuit Pod is an X Layer-native operating account for a TapeOut application. It keeps the same address, assets, receipts and service surface while control passes to the next operator.",
    openPods: "Create a Circuit Pod",
    browse: "Inspect live Circuits",
    processors: "Public processors",
    published: "Published circuits",
    receipts: "Usage receipts",
    tapeRegistry: "TapeOut registry",
    configureRegistry: "Configure Registry",
    noRouter: "No configured Router",
    refresh: "Refresh source data",
    operational: "The operating rail",
    fourLoops: "From Circuit to handoff",
    liveArchitecture: "Live architecture",
    discover: "Discover",
    protect: "Package",
    prove: "Prove",
    integrate: "Integrate",
    openRegistry: "Open registry",
    viewVaults: "Open Pods",
    seeActivity: "See activity",
    readKit: "Read developer kit",
    highestDensity: "Highest circuit density",
    source: "Source",
    different: "What makes this different",
    primitive:
      "TapeOut makes the compute permanent. X Layer makes the project transferable.",
    inspect: "Inspect the contracts",
    sourceRegistry: "TapeOut registry",
    registryFor: "Registry for",
    realCircuits: "real circuits.",
    noManifests: "No deployed manifests yet",
    noManifestsDesc:
      "Connect the deployed Registry and publish the first real Circuit. Preview data is intentionally hidden.",
  },
  zh: {
    workspace: "工作空间",
    external: "外部工具",
    protocol: "TapeOut 协议",
    intelligence: "公开情报",
    toolkit: "TapeKit DeWeb",
    nonCustody: "非托管设计",
    signedOnly: "资金移动只通过钱包签名的 X Layer 交易。",
    configured: "已配置",
    predeployment: "待部署",
    connectX: "连接 X Layer",
    connect: "连接钱包",
    connecting: "连接中…",
    dataConnected: "已接入 TapeOut 公开数据",
    syncing: "正在同步公开数据",
    dataUnavailable: "公开数据暂时不可用",
    make: "让一块 Circuit",
    productive: "变成可交接的链上项目。",
    hero: "Circuit Pod 是 TapeOut 应用在 X Layer 上的运营账户：资产、收入、权限、服务入口和调用历史留在原地址，只把控制权交给下一位运营者。",
    openPods: "创建 Circuit Pod",
    browse: "查看真实 Circuit",
    processors: "公开处理器",
    published: "已发布电路",
    receipts: "调用收据",
    tapeRegistry: "TapeOut 注册表",
    configureRegistry: "请配置注册表",
    noRouter: "Router 尚未配置",
    refresh: "刷新源数据",
    operational: "运营主链路",
    fourLoops: "从 Circuit 到整体交接",
    liveArchitecture: "实时架构",
    discover: "发现",
    protect: "打包",
    prove: "验证",
    integrate: "接入",
    openRegistry: "打开注册表",
    viewVaults: "打开 Pods",
    seeActivity: "查看活动",
    readKit: "阅读开发者工具包",
    highestDensity: "电路密度最高的处理器",
    source: "数据源",
    different: "我们补上的能力",
    primitive: "TapeOut 让计算永久，X Layer 让项目可以整体交接。",
    inspect: "查看合约",
    sourceRegistry: "TapeOut 注册表",
    registryFor: "面向真实",
    realCircuits: "电路的注册表。",
    noManifests: "还没有已部署的 Manifest",
    noManifestsDesc:
      "配置已部署的 Registry 后发布第一块真实电路。预览数据不会冒充线上数据。",
  },
} as const;
const navLabels = {
  en: [
    "Overview",
    "Circuit Pods",
    "Circuit registry",
    "Settlement flows",
    "TapeOut ecosystem",
    "Developer kit",
    "On-chain activity",
    "Publish circuit",
    "Launch admin",
  ],
  zh: [
    "概览",
    "Circuit Pods",
    "电路注册表",
    "项目结算流程",
    "TapeOut 生态",
    "开发者工具包",
    "链上活动",
    "发布电路",
    "上线管理",
  ],
};
const ecosystem: EcosystemItem[] = [
  {
    name: "TapeOut Protocol",
    category: "Official",
    description:
      "Design NAND and LATCH circuits, mint transistors and tape out Circuit NFTs.",
    url: "https://tapeout.net/",
    live: true,
    accent: "cyan",
  },
  {
    name: "TapeKit",
    category: "DeWeb",
    description:
      "Open-source tape:// gateway that reads containers from chain and verifies content hashes.",
    url: "https://tapekit.org/",
    live: true,
    accent: "violet",
  },
  {
    name: "TapeOut Intelligence",
    category: "Data",
    description:
      "Public processor registry, mint activity, taskbank and evidence-backed API.",
    url: "https://tapeout.work/",
    live: true,
    accent: "lime",
  },
  {
    name: "TapeHub.ai",
    category: "Launchpad",
    description:
      "Create a project, mint transistors and graduate liquidity into PancakeSwap.",
    url: "https://tapehub.ai/",
    live: true,
    accent: "amber",
  },
  {
    name: "TapeOut Market",
    category: "Marketplace",
    description:
      "Circuit, transistor and mining equipment markets with public order data.",
    url: "https://tapeout.market/",
    live: true,
    accent: "rose",
  },
  {
    name: "Circuit Commons",
    category: "X Layer",
    description:
      "Project workflows that call verified Circuits and settle outcomes on X Layer.",
    url: "https://yanwenzhe519-ctrl.github.io/tapeout-circuit-commons/",
    live: Boolean(routerAddress && registryAddress),
    accent: "blue",
  },
];

function App() {
  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem("cc-language") as Language) || "en",
  );
  const [view, setView] = useState<View>("overview");
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [processors, setProcessors] = useState<Processor[]>([]);
  const [processorTotal, setProcessorTotal] = useState(0);
  const [dataState, setDataState] = useState<
    "loading" | "live" | "unavailable"
  >("loading");
  const [catalog, setCatalog] = useState<CircuitManifest[]>([]);
  const [receipts, setReceipts] = useState<UsageReceipt[]>([]);
  const [position, setPosition] = useState<Position | null>(null);
  const networkReady = chainId === XLAYER_CHAIN_ID;
  const contractsReady = Boolean(
    routerAddress && registryAddress && factoryAddress && tapeoutProcessorAddress && ownershipAdapterAddress && processorRecipientAddress,
  );
  const vaultReady = Boolean(
    revenueVaultAddress && routerAddress && networkReady,
  );
  async function refreshData() {
    setDataState("loading");
    try {
      const processorDataUrl = import.meta.env.PROD
        ? import.meta.env.BASE_URL + "data/tapeout-processors.json"
        : "/api/tapeout-processors?page=1&page_size=8&sort=circuits";
      const response = await fetch(processorDataUrl);
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as {
        total?: number;
        items?: unknown[];
        processors?: unknown[];
      };
      const rawRows = (payload.items || payload.processors || []) as Array<{
        address: string;
        name: string;
        creator_address?: string;
        creator?: string;
        minted: string;
        supply_cap?: string;
        supplyCap?: string;
        circuit_count?: number;
        circuitCount?: number;
        mint_price?: string;
        mintPrice?: string;
      }>;
      const rows = rawRows.map((row) => ({
        address: row.address,
        name: row.name,
        creator: row.creator || row.creator_address || "",
        minted: row.minted,
        supplyCap: row.supplyCap || row.supply_cap || "",
        mintPrice: row.mintPrice || row.mint_price || "",
        circuitCount: row.circuitCount ?? row.circuit_count ?? 0,
      }));
      setProcessors(rows);
      setProcessorTotal(payload.total || rows.length);
      setDataState("live");
    } catch {
      setDataState("unavailable");
    }
  }
  useEffect(() => {
    refreshData();
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (registryAddress)
      readPublishedCircuits()
        .then((rows) => {
          if (!cancelled) setCatalog(rows);
        })
        .catch(() => undefined);
    if (routerAddress)
      readUsageReceipts()
        .then((rows) => {
          if (!cancelled) setReceipts(rows);
        })
        .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!account || !vaultReady) {
      setPosition(null);
      return;
    }
    readVaultPosition(account)
      .then(setPosition)
      .catch(() => setPosition(null));
  }, [account, vaultReady, view]);
  async function connect() {
    setBusy(true);
    setMessage("");
    try {
      const result = await connectWallet();
      setAccount(result.address);
      setChainId(result.chainId);
      if (result.chainId !== XLAYER_CHAIN_ID)
        setMessage("Wallet connected. Switch to X Layer for transactions.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Wallet connection failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function switchNetwork() {
    setBusy(true);
    setMessage("");
    try {
      await switchToXLayer();
      setChainId(XLAYER_CHAIN_ID);
      setMessage("X Layer is ready.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Network switch failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  const go = (next: View) => {
    setView(next);
    setMobileNav(false);
  };
  const c = text[language];
  const localizedNav = nav.map((item, index) => ({
    ...item,
    label: navLabels[language][index],
  }));
  function toggleLanguage(next: Language) {
    setLanguage(next);
    localStorage.setItem("cc-language", next);
  }
  return (
    <LanguageContext.Provider value={language}>
      <div className="app-shell">
        <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
          <div className="brand-lockup">
            <div className="brand-mark">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div>
              <strong>
                CIRCUIT
                <br />
                COMMONS
              </strong>
              <small>TAPEOUT / X LAYER</small>
            </div>
          </div>
          <div className="sidebar-label">{c.workspace}</div>
          <nav className="primary-nav" aria-label="Primary navigation">
            {localizedNav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-item ${view === id ? "active" : ""}`}
                onClick={() => go(id)}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-rule" />
          <div className="sidebar-label">{c.external}</div>
          <a
            className="nav-item link-item"
            href="https://tapeout.net/"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={16} />
            <span>{c.protocol}</span>
            <ExternalLink size={12} />
          </a>
          <a
            className="nav-item link-item"
            href="https://tapeout.work/"
            target="_blank"
            rel="noreferrer"
          >
            <Gauge size={16} />
            <span>{c.intelligence}</span>
            <ExternalLink size={12} />
          </a>
          <a
            className="nav-item link-item"
            href="https://tapekit.org/"
            target="_blank"
            rel="noreferrer"
          >
            <Globe2 size={16} />
            <span>{c.toolkit}</span>
            <ExternalLink size={12} />
          </a>
          <div className="sidebar-bottom">
            <div className="security-note">
              <ShieldCheck size={16} />
              <div>
                <b>{c.nonCustody}</b>
                <small>{c.signedOnly}</small>
              </div>
            </div>
            <div className="version-line">
              <span>v0.2.0</span>
              <span>{contractsReady ? c.configured : c.predeployment}</span>
            </div>
          </div>
        </aside>
        {mobileNav && (
          <button
            className="scrim"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          />
        )}
        <main className="main-shell">
          <header className="topbar">
            <button
              className="mobile-menu"
              onClick={() => setMobileNav(true)}
              aria-label={language === "zh" ? "打开导航" : "Open navigation"}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              <span>{c.workspace}</span>
              <ChevronRight size={14} />
              <b>{localizedNav.find((item) => item.id === view)?.label}</b>
            </div>
            <div className="top-actions">
              <div className="language-switch" aria-label="Language">
                <button
                  className={language === "en" ? "active" : ""}
                  onClick={() => toggleLanguage("en")}
                >
                  EN
                </button>
                <button
                  className={language === "zh" ? "active" : ""}
                  onClick={() => toggleLanguage("zh")}
                >
                  中文
                </button>
              </div>
              <button
                className={`network-pill ${networkReady ? "ready" : ""}`}
                onClick={networkReady ? undefined : switchNetwork}
              >
                <span className="network-dot" />
                {networkReady ? "X Layer · 196" : c.connectX}
              </button>
              {account ? (
                <button className="wallet-chip" onClick={connect}>
                  <span className="wallet-dot" />
                  {shortAddress(account)}
                </button>
              ) : (
                <button
                  className="connect-button"
                  onClick={connect}
                  disabled={busy}
                >
                  <Wallet size={15} />
                  {busy ? c.connecting : c.connect}
                </button>
              )}
            </div>
          </header>
          <div className="content-wrap">
            {message && (
              <div className="toast" role="status">
                <Activity size={16} />
                <span>{message}</span>
                <button
                  onClick={() => setMessage("")}
                  aria-label={language === "zh" ? "关闭提示" : "Dismiss"}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            {view === "overview" && (
              <Overview
                dataState={dataState}
                processorTotal={processorTotal}
                processors={processors}
                catalogCount={catalog.length}
                receiptCount={receipts.length}
                contractsReady={contractsReady}
                onRefresh={refreshData}
                onNavigate={go}
              />
            )}
            {view === "pods" && (
              <Pods
                account={account}
                networkReady={networkReady}
                contractsReady={contractsReady}
                circuitId={import.meta.env.VITE_CIRCUIT_ID || ""}
                onConnect={connect}
                onSwitch={switchNetwork}
              />
            )}
            {view === "registry" && (
              <Registry
                catalog={catalog}
                processors={processors}
                processorTotal={processorTotal}
                dataState={dataState}
                account={account}
                networkReady={networkReady}
                contractsReady={contractsReady && liveCallsEnabled}
                busy={busy}
                onConnect={connect}
                onSwitch={switchNetwork}
                onRun={async (circuit, input) => {
                  setBusy(true);
                  try {
                    const tx = await runCircuit(
                      circuit.circuitId,
                      input as `0x${string}`,
                      circuit.price,
                    );
                    setMessage(
                      language === "zh"
                        ? `等待电路调用确认：${shortAddress(tx)}`
                        : `Waiting for circuit confirmation: ${shortAddress(tx)}`,
                    );
                    const receipt = await waitForTransaction(tx);
                    if (receipt.status !== "success") throw new Error(language === "zh" ? "电路调用交易失败。" : "The circuit call transaction failed.");
                    setMessage(
                      language === "zh"
                        ? `电路调用已确认：${shortAddress(tx)}`
                        : `Circuit call confirmed: ${shortAddress(tx)}`,
                    );
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : language === "zh"
                          ? "电路调用失败。"
                          : "Circuit call failed.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
            {view === "vaults" && (
              <Vaults
                account={account}
                networkReady={networkReady}
                vaultReady={vaultReady}
                position={position}
                busy={busy}
                onConnect={connect}
                onSwitch={switchNetwork}
                onDeposit={async (amount) => {
                  setBusy(true);
                  try {
                    const tx = await depositToVault(amount);
                    setMessage(
                      language === "zh"
                        ? `等待存款确认：${shortAddress(tx)}`
                        : `Waiting for deposit confirmation: ${shortAddress(tx)}`,
                    );
                    const receipt = await waitForTransaction(tx);
                    if (receipt.status !== "success") throw new Error(language === "zh" ? "存款交易失败。" : "The deposit transaction failed.");
                    setMessage(
                      language === "zh"
                        ? `存款已确认：${shortAddress(tx)}`
                        : `Deposit confirmed: ${shortAddress(tx)}`,
                    );
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : language === "zh"
                          ? "存款失败。"
                          : "Deposit failed.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
            {view === "ecosystem" && <Ecosystem />}
            {view === "developers" && <Developers />}
            {view === "admin" && (
              <AdminLaunch
                account={account}
                networkReady={networkReady}
                contractsReady={contractsReady}
                onConnect={connect}
                onSwitch={switchNetwork}
              />
            )}
            {view === "activity" && (
              <ActivityPage receipts={receipts} dataState={dataState} />
            )}
            {view === "publish" && (
              <Publish
                account={account}
                onConnect={connect}
                configReady={Boolean(
                  registryAddress &&
                  ownershipAdapterAddress &&
                  tapeoutProcessorAddress,
                )}
                busy={busy}
                onPublish={async (input) => {
                  setBusy(true);
                  try {
                    const result = await publishCircuit(input, account);
                    setMessage(
                      language === "zh"
                        ? `等待 Manifest 发布确认：${shortAddress(result.txHash)}`
                        : `Waiting for Manifest confirmation: ${shortAddress(result.txHash)}`,
                    );
                    const receipt = await waitForTransaction(result.txHash);
                    if (receipt.status !== "success") throw new Error(language === "zh" ? "Manifest 发布交易失败。" : "The Manifest publication transaction failed.");
                    const published = await readPublishedCircuits();
                    setCatalog(published);
                    setView("registry");
                    setMessage(
                      language === "zh"
                        ? `Manifest 已确认发布：${shortAddress(result.txHash)}`
                        : `Manifest published on-chain: ${shortAddress(result.txHash)}`,
                    );
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : language === "zh"
                          ? "发布失败。"
                          : "Publish failed.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
          </div>
        </main>
      </div>
    </LanguageContext.Provider>
  );
}

export default App;

function Status({ live, children }: { live: boolean; children: ReactNode }) {
  return (
    <span className={`status-chip ${live ? "live" : "pending"}`}>
      <i />
      {children}
    </span>
  );
}
function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="metric">
      <span className={`metric-dot ${tone}`} />
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{note}</em>
      </div>
    </div>
  );
}
function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <LoaderCircle
        size={18}
        className={text.includes("Reading") ? "spin" : ""}
      />
      <span>{text}</span>
    </div>
  );
}
function Loop({
  icon: Icon,
  number,
  title,
  text,
  action,
  onClick,
}: {
  icon: typeof Layers3;
  number: string;
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="loop-item">
      <div className="loop-icon">
        <Icon size={18} />
      </div>
      <span className="loop-number">{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
        <button onClick={onClick}>
          {action}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
function Overview({
  dataState,
  processorTotal,
  processors,
  catalogCount,
  receiptCount,
  contractsReady,
  onRefresh,
  onNavigate,
}: {
  dataState: "loading" | "live" | "unavailable";
  processorTotal: number;
  processors: Processor[];
  catalogCount: number;
  receiptCount: number;
  contractsReady: boolean;
  onRefresh: () => void;
  onNavigate: (v: View) => void;
}) {
  const lang = useLanguage();
  const c = text[lang];
  const zh = lang === "zh";
  return (
    <>
      <section className="hero-band">
        <div className="hero-copy">
          <h1>
            {c.make}
            <br />
            <em>{c.productive}</em>
          </h1>
          <p>{c.hero}</p>
          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={() => onNavigate("pods")}
            >
              <PackageOpen size={16} />
              {c.openPods}
            </button>
            <button
              className="outline-button"
              onClick={() => onNavigate("registry")}
            >
              <Layers3 size={16} />
              {c.browse}
            </button>
          </div>
          <div className="hero-proof-row">
            <Status live={dataState === "live"}>
              {dataState === "live"
                ? c.dataConnected
                : dataState === "loading"
                  ? c.syncing
                  : c.dataUnavailable}
            </Status>
            <span>{contractsReady
              ? zh ? "Circuit 控制权 → Pod Account → X Layer 收入" : "Circuit control → Pod Account → X Layer revenue"
              : zh ? "Circuit 身份 → 官方 Container → Pod 待部署" : "Circuit identity → official Container → Pod pending deployment"}</span>
          </div>
        </div>
        <div
          className="hero-diagram"
          aria-label={
            zh ? "Circuit Pod 运营和交接流程" : "Circuit Pod operating and handoff flow"
          }
        >
          <div className="diagram-node">
            <span>IDENTITY</span>
            <b>{zh ? "TapeOut Circuit" : "TapeOut Circuit"}</b>
            <small>{zh ? "唯一项目身份" : "canonical project identity"}</small>
          </div>
          <ChevronRight />
          <div className="diagram-node accent">
            <span>ACCOUNT</span>
            <b>{zh ? "Pod Account" : "Pod Account"}</b>
            <small>{zh ? "固定 X Layer 地址" : "fixed X Layer address"}</small>
          </div>
          <ChevronRight />
          <div className="diagram-node">
            <span>SETTLEMENT</span>
            <b>{zh ? "OKB Revenue" : "OKB Revenue"}</b>
            <small>{zh ? "调用、分账、收据" : "calls · splits · receipts"}</small>
          </div>
          <ChevronRight />
          <div className="diagram-node handoff-node">
            <span>HANDOFF</span>
            <b>{zh ? "新运营者" : "New operator"}</b>
            <small>{zh ? "地址和历史不变" : "same address, same history"}</small>
          </div>
          <div className="diagram-line" />
        </div>
      </section>
      <section className="metric-strip">
        <Metric
          label={c.processors}
          value={dataState === "live" ? processorTotal.toLocaleString() : "—"}
          note={c.tapeRegistry}
          tone="cyan"
        />
        <Metric
          label={c.published}
          value={catalogCount ? catalogCount.toString() : "—"}
          note={
            catalogCount
              ? zh
                ? "Registry 事件"
                : "Registry events"
              : c.configureRegistry
          }
          tone="lime"
        />
        <Metric
          label={c.receipts}
          value={receiptCount ? receiptCount.toString() : "—"}
          note={
            receiptCount
              ? zh
                ? "最近索引窗口"
                : "Last indexed window"
              : c.noRouter
          }
          tone="amber"
        />
        <button className="refresh-control" onClick={onRefresh}>
          <RefreshCw size={15} />
          {c.refresh}
        </button>
      </section>
      <section className="overview-grid">
        <div className="panel overview-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{c.operational}</span>
              <h2>{c.fourLoops}</h2>
            </div>
            <Status live={contractsReady}>{contractsReady ? c.configured : c.predeployment}</Status>
          </div>
          <div className="loop-list">
            <Loop
              icon={Layers3}
              number="01"
              title={zh ? "验证身份" : "Verify identity"}
              text={
                zh
                  ? "读取真实 Processor、Circuit 所有者和官方 Container 状态。"
                  : "Read the real Processor, Circuit owner and official Container state."
              }
              action={c.inspect}
              onClick={() => onNavigate("registry")}
            />
            <Loop
              icon={PackageOpen}
              number="02"
              title={zh ? "创建 Pod" : "Create a Pod"}
              text={
                zh
                  ? "把 Container、服务入口和 X Layer Treasury 绑定到同一个运营账户。"
                  : "Bind the Container, service surface and X Layer Treasury to one operating account."
              }
              action={c.openPods}
              onClick={() => onNavigate("pods")}
            />
            <Loop
              icon={CircleDollarSign}
              number="03"
              title={zh ? "在 X Layer 结算" : "Settle on X Layer"}
              text={
                zh
                  ? "用户用 OKB 调用，收入进入 Pod，按规则分配并生成收据。"
                  : "Users pay in OKB; revenue lands in the Pod, splits by policy and emits a receipt."
              }
              action={c.seeActivity}
              onClick={() => onNavigate("activity")}
            />
            <Loop
              icon={GitBranch}
              number="04"
              title={zh ? "整体交接" : "Hand off the project"}
              text={
                zh
                  ? "转移 Circuit 后，Pod 地址、资产、收入和运营历史继续保留。"
                  : "Transfer the Circuit and keep the Pod address, assets, revenue and operating history."
              }
              action={zh ? "查看交接台" : "Open handoff desk"}
              onClick={() => onNavigate("pods")}
            />
          </div>
        </div>
        <div className="panel processor-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{c.sourceRegistry}</span>
              <h2>{c.highestDensity}</h2>
            </div>
            <a href="https://tapeout.work/" target="_blank" rel="noreferrer">
              {c.source} <ExternalLink size={13} />
            </a>
          </div>
          {processors.length ? (
            <div className="processor-list">
              {processors.slice(0, 5).map((p, i) => (
                <div className="processor-line" key={p.address}>
                  <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <b>{p.name || shortAddress(p.address)}</b>
                    <small>
                      {p.circuitCount.toLocaleString()} circuits ·{" "}
                      {shortAddress(p.address)}
                    </small>
                  </div>
                  <strong>
                    {p.minted && p.supplyCap
                      ? `${Math.round((Number(p.minted) / Number(p.supplyCap)) * 100)}%`
                      : "—"}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              text={
                dataState === "loading"
                  ? zh
                    ? "正在读取公开注册表…"
                    : "Reading public registry…"
                  : zh
                    ? "数据源暂时不可用"
                    : "Source temporarily unavailable"
              }
            />
          )}
        </div>
      </section>
      <section className="section-callout">
        <div>
          <span className="panel-kicker">{c.different}</span>
          <h2>{c.primitive}</h2>
          <p>
            {zh
              ? "TapeKit 让网站随 Circuit 转移；Circuit Commons 让资产、收入、权限和运营历史也留在同一个 X Layer Pod 里。"
              : "TapeKit moves the site with a Circuit. Circuit Commons keeps the assets, revenue, permissions and operating history in the same X Layer Pod."}
          </p>
        </div>
        <a
          href="https://github.com/yanwenzhe519-ctrl/tapeout-circuit-commons"
          target="_blank"
          rel="noreferrer"
          className="text-action"
        >
          {c.inspect} <ArrowUpRight size={15} />
        </a>
      </section>
    </>
  );
}

function Pods({
  account,
  networkReady,
  contractsReady,
  circuitId: initialCircuitId,
  onConnect,
  onSwitch,
}: {
  account: string;
  networkReady: boolean;
  contractsReady: boolean;
  circuitId: string;
  onConnect: () => void;
  onSwitch: () => void;
}) {
  const lang = useLanguage();
  const zh = lang === "zh";
  const [circuitIdInput, setCircuitIdInput] = useState(initialCircuitId);
  const circuitId = useMemo(() => {
    try {
      const parsed = BigInt(circuitIdInput || "0");
      return parsed > 0n ? parsed : 0n;
    } catch {
      return 0n;
    }
  }, [circuitIdInput]);
  const [podName, setPodName] = useState("Circuit Service Pod");
  const [serviceUrl, setServiceUrl] = useState("https://");
  const [handoffTarget, setHandoffTarget] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [container, setContainer] = useState<Awaited<ReturnType<typeof readTapeoutContainer>>>(null);
  const [containerBusy, setContainerBusy] = useState(false);
  const [containerMessage, setContainerMessage] = useState("");
  const [podMessage, setPodMessage] = useState("");
  const [podBusy, setPodBusy] = useState(false);
  const [podAddress, setPodAddress] = useState("");
  const [circuitOwner, setCircuitOwner] = useState("");
  const validCircuit = circuitId > 0n;
  const userStep = !validCircuit ? 1 : !account || !circuitOwner || circuitOwner.toLowerCase() !== account.toLowerCase() ? 2 : !networkReady ? 3 : !container?.opened ? 4 : !contractsReady ? 5 : 6;
  const owner = circuitOwner || "pending ownerOf(circuitId)";
  useEffect(() => {
    let cancelled = false;
    setContainer(null);
    setPodAddress("");
    setCircuitOwner("");
    setContainerMessage("");
    setPodMessage("");
    if (!validCircuit) return () => { cancelled = true; };
    readTapeoutContainer(circuitId).then((status) => {
      if (!cancelled) setContainer(status);
    });
    readCircuitOwner(circuitId).then((address) => {
      if (!cancelled) setCircuitOwner(address);
    });
    readFactoryPod(circuitId).then((address) => {
      if (!cancelled) setPodAddress(address);
    });
    return () => { cancelled = true; };
  }, [circuitId, validCircuit]);
  const manifest = JSON.stringify(
    {
      schema: "circuit-pod/v2",
      name: podName || "Untitled Pod",
      circuit: { processor: tapeoutProcessorAddress || "pending", ownershipAdapter: ownershipAdapterAddress || "pending", circuitId: circuitId.toString() },
      pod: { factory: factoryAddress || "pending", account: podAddress || podAccountAddress || "pending" },
      container: { adapter: containerAdapterAddress || "pending", address: container?.address || tapeoutContainerAddress || "pending", opened: container?.opened || false, deployed: container?.deployed || false },
      treasury: { revenueRecipient: podAddress || podAccountAddress || "pending", processorRecipient: processorRecipientAddress || "pending" },
      service: { uri: serviceUrl || "pending" },
      owner,
      handoffTarget: handoffTarget || null,
      chain: { name: "X Layer", chainId: 196 },
    },
    null,
    2,
  );
  async function copyManifest() {
    try {
      await navigator.clipboard.writeText(manifest);
      setPrepared(true);
    } catch {
      setPrepared(true);
    }
  }
  async function openContainer() {
    if (!account) return onConnect();
    if (!validCircuit) {
      setContainerMessage(zh ? "请输入大于 0 的 Circuit ID。" : "Enter a Circuit ID greater than 0.");
      return;
    }
    setContainerBusy(true);
    setContainerMessage("");
    try {
      const tx = await openTapeoutContainer(circuitId, account);
      setContainerMessage(zh ? `等待 Container 开启确认：${shortAddress(tx)}` : `Waiting for Container confirmation: ${shortAddress(tx)}`);
      const receipt = await waitForTransaction(tx);
      if (receipt.status !== "success") throw new Error(zh ? "Container 开启交易失败。" : "The Container open transaction failed.");
      const status = await readTapeoutContainer(circuitId);
      setContainer(status);
      if (!status?.opened) throw new Error(zh ? "交易已确认，但官方 opener 尚未报告已开启，请稍后刷新。" : "The transaction is confirmed, but the official opener has not reported the Container as open yet.");
      setContainerMessage(zh ? `官方 Container 已确认开启：${shortAddress(tx)}` : `Official Container opened: ${shortAddress(tx)}`);
    } catch (error) {
      setContainerMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setContainerBusy(false);
    }
  }
  async function createPod() {
    if (!account) return onConnect();
    if (!networkReady || !container?.opened) return;
    if (!serviceUrl || serviceUrl === "https://") {
      setPodMessage(zh ? "请先填写有效的服务入口。" : "Enter a valid service URI first.");
      return;
    }
    setPodBusy(true);
    setPodMessage("");
    try {
      const serviceHash = keccak256(stringToHex(manifest));
      const tx = await createPodOnChain(account, circuitId, serviceHash, serviceUrl);
      setPodMessage(zh ? `等待 Pod 创建确认：${shortAddress(tx)}` : `Waiting for Pod creation: ${shortAddress(tx)}`);
      const receipt = await waitForTransaction(tx);
      if (receipt.status !== "success") throw new Error(zh ? "Pod 创建交易失败。" : "Pod creation failed.");
      const createdPod = await readFactoryPod(circuitId);
      setPodAddress(createdPod);
      setPodMessage(zh ? `Pod 已在 X Layer 创建：${shortAddress(tx)}` : `Pod created on X Layer: ${shortAddress(tx)}`);
    } catch (error) {
      setPodMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setPodBusy(false);
    }
  }
  return (
    <>
      <section className="page-heading compact pod-heading">
        <div>
          <Status live={Boolean(container?.opened && container?.deployed)}>
            {container?.opened && container?.deployed
              ? zh ? "POD 工作区 / 官方容器已部署" : "POD WORKSPACE / OFFICIAL CONTAINER DEPLOYED"
              : container?.opened
                ? zh ? "POD 工作区 / 已开启，等待部署" : "POD WORKSPACE / OPENED, DEPLOYMENT PENDING"
                : containerAdapterAddress
                  ? zh ? "POD 工作区 / 官方 opener 已配置" : "POD WORKSPACE / OFFICIAL OPENER CONFIGURED"
                  : zh ? "POD 工作区 / 容器适配器待配置" : "POD WORKSPACE / CONTAINER OPENER PENDING"}
          </Status>
          <h1>
            {zh ? "接管完整的" : "Own the whole"}
            <br />
            <em>{zh ? "链上应用。" : "on-chain app."}</em>
          </h1>
          <p>
            {zh
              ? "把真实 TapeOut Circuit、官方 Container、服务入口和 X Layer 资产打包成一个可运营、可交接的 Pod。"
              : "Package a real TapeOut Circuit, its official Container, service surface and X Layer assets into one operable, transferable Pod."}
          </p>
        </div>
        <div className="heading-actions">
          {!account ? (
            <button className="primary-button" onClick={onConnect}>
              <Wallet size={15} />
              {zh ? "连接钱包" : "Connect wallet"}
            </button>
          ) : !networkReady ? (
            <button className="primary-button" onClick={onSwitch}>
              <Network size={15} />
              {zh ? "切换到 X Layer" : "Switch to X Layer"}
            </button>
          ) : (
            <span className="pod-ready-chip">
              <Check size={14} />
              {zh ? "钱包已连接" : "Wallet connected"}
            </span>
          )}
        </div>
      </section>
      <section className="pod-flow" aria-label={zh ? "Pod 生命周期" : "Pod lifecycle"}>
        {[
          ["01", zh ? "Circuit" : "Circuit", zh ? "永久的计算逻辑" : "Permanent compute"],
          ["02", zh ? "Container" : "Container", zh ? "拥有地址的业务容器" : "Addressable business shell"],
          ["03", zh ? "X Layer 资产" : "X Layer assets", zh ? "OKB、合约和收入" : "OKB, contracts and revenue"],
          ["04", zh ? "Handoff" : "Handoff", zh ? "无迁移交接给下一位运营者" : "Transfer without migration"],
        ].map(([number, title, detail], index) => (
          <div className={`pod-flow-step ${index === 1 ? "accent" : ""}`} key={number}>
            <span>{number}</span>
            <b>{title}</b>
            <small>{detail}</small>
          </div>
        ))}
      </section>
      <div className="section-callout pod-next-step">
        <div><strong>{zh ? `第 ${userStep} 步：${userStep === 1 ? "选择 Circuit" : userStep === 2 ? "连接 Circuit 所有者钱包" : userStep === 3 ? "切换至 X Layer" : userStep === 4 ? "开启官方 Container" : userStep === 5 ? "等待 X Layer 协议配置" : "准备交接清单"}` : `Step ${userStep}: ${userStep === 1 ? "Choose a Circuit" : userStep === 2 ? "Connect the Circuit owner wallet" : userStep === 3 ? "Switch to X Layer" : userStep === 4 ? "Open the official Container" : userStep === 5 ? "Wait for X Layer protocol configuration" : "Prepare the handoff manifest"}`}</strong><p>{zh ? "系统会在满足当前步骤后启用下一项操作。" : "The next action unlocks only after the current prerequisite is satisfied."}</p></div>
        <Check size={18} />
      </div>
      <section className="pod-layout">
        <div className="panel pod-builder">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{zh ? "POD BLUEPRINT" : "POD BLUEPRINT"}</span>
              <h2>{zh ? "准备一个可交接的应用单元" : "Prepare a handoff-ready app unit"}</h2>
            </div>
            <Status live={Boolean(container?.opened)}>{container?.opened ? (zh ? "已打开" : "Opened") : zh ? "待打开" : "Awaiting open"}</Status>
          </div>
          <div className="pod-form">
            <label>
              {zh ? "TapeOut Circuit ID" : "TapeOut Circuit ID"}
              <input value={circuitIdInput} onChange={(event) => setCircuitIdInput(event.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder={zh ? "例如 4" : "e.g. 4"} />
              <small>{zh ? "任何属于当前 Processor 的 Circuit 都可以使用。" : "Use any Circuit minted by the configured Processor."}</small>
            </label>
            <label>
              {zh ? "Pod 名称" : "Pod name"}
              <input value={podName} onChange={(event) => setPodName(event.target.value)} />
            </label>
            <label>
              {zh ? "服务入口（可选）" : "Service surface (optional)"}
              <input value={serviceUrl} onChange={(event) => setServiceUrl(event.target.value)} placeholder="https://" />
            </label>
            <label>
              {zh ? "预设接手地址（可选）" : "Handoff target (optional)"}
              <input value={handoffTarget} onChange={(event) => setHandoffTarget(event.target.value)} placeholder="0x..." />
            </label>
          </div>
          <div className="pod-facts">
            <div><small>{zh ? "Circuit" : "Circuit"}</small><b>{tapeoutProcessorAddress ? `#${circuitId.toString()} · RuleChip` : zh ? "待配置真实处理器" : "Processor required"}</b></div>
            <div><small>{zh ? "Container" : "Container"}</small><b>{container?.address ? shortAddress(container.address) : zh ? "读取中" : "Reading"}</b></div>
            <div><small>{zh ? "Pod Account" : "Pod Account"}</small><b>{podAddress ? shortAddress(podAddress) : podAccountAddress ? shortAddress(podAccountAddress) : zh ? "创建后生成" : "Created per Circuit"}</b></div>
            <div><small>{zh ? "Circuit 所有者" : "Circuit owner"}</small><b>{shortAddress(owner)}</b></div>
            <div><small>{zh ? "所有权验证" : "Ownership check"}</small><b>{!validCircuit ? (zh ? "输入 Circuit ID" : "Enter Circuit ID") : !circuitOwner ? (zh ? "链上读取失败" : "Owner unavailable") : account && circuitOwner.toLowerCase() === account.toLowerCase() ? (zh ? "钱包匹配" : "Wallet matches") : (zh ? "需所有者钱包" : "Owner wallet required")}</b></div>
            <div><small>{zh ? "网络" : "Network"}</small><b>{networkReady ? "X Layer · 196" : zh ? "未连接" : "Not connected"}</b></div>
          </div>
          <div className="pod-actions">
            <button className="primary-button" onClick={copyManifest} disabled={!validCircuit}>
              <Copy size={15} />
              {prepared ? (zh ? "清单已复制" : "Manifest copied") : zh ? "生成交接清单" : "Prepare handoff manifest"}
            </button>
            <button className="outline-button" onClick={openContainer} disabled={!validCircuit || !account || !circuitOwner || circuitOwner.toLowerCase() !== account.toLowerCase() || !containerAdapterAddress || !tapeoutProcessorAddress || !networkReady || containerBusy || Boolean(container?.opened)}>
              <Box size={15} />
              {containerBusy ? (zh ? "等待钱包确认…" : "Confirm in wallet…") : container?.opened ? (zh ? "Container 已打开" : "Container opened") : zh ? `打开官方 Container（${container?.fee || "0.08"} OKB）` : `Open official Container (${container?.fee || "0.08"} OKB)`}
            </button>
            <button className="primary-button" onClick={createPod} disabled={!validCircuit || !account || !circuitOwner || circuitOwner.toLowerCase() !== account.toLowerCase() || !networkReady || !container?.opened || !factoryAddress || podBusy || Boolean(podAddress)}>
              <PackageOpen size={15} />
              {podBusy ? (zh ? "等待钱包确认…" : "Confirm in wallet…") : zh ? "创建 Pod Account" : "Create Pod Account"}
            </button>
          </div>
          {containerMessage && <p className="pod-disclaimer">{containerMessage}</p>}
          {podMessage && <p className="pod-disclaimer">{podMessage}</p>}
          <p className="pod-disclaimer">
            {zh
              ? "打开 Container 会向 TapeOut 官方 opener 支付链上 FEE；Registry、Router 和服务入口仍需单独部署与验证。"
              : "Opening pays the official TapeOut opener FEE on X Layer. Your Registry, Router and service surface still need their own deployment and verification."}
          </p>
        </div>
        <div className="panel pod-inspector">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{zh ? "HANDOFF CHECK" : "HANDOFF CHECK"}</span>
              <h2>{zh ? "交接前检查" : "Before you hand off"}</h2>
            </div>
            <ShieldCheck size={18} className="pod-shield" />
          </div>
          <div className="pod-checks">
            {[
              [contractsReady, zh ? "Registry / Router / Factory 已配置" : "Registry / Router / Factory configured"],
              [Boolean(containerAdapterAddress && container?.address), zh ? "官方 Container opener 已配置" : "Official Container opener configured"],
              [Boolean(tapeoutProcessorAddress && container?.opened), zh ? "真实 Circuit 与 Container 已绑定" : "Real Circuit and Container bound"],
              [networkReady && Boolean(account), zh ? "钱包和 X Layer 已准备" : "Wallet and X Layer ready"],
            ].map(([ready, label]) => (
              <div className="pod-check" key={label as string}>
                <span className={ready ? "ready" : "pending"}>{ready ? <Check size={13} /> : <span />}</span>
                <b>{label}</b>
                <small>{ready ? (zh ? "已满足" : "Ready") : zh ? "待验证" : "Pending"}</small>
              </div>
            ))}
          </div>
          <pre className="pod-manifest">{manifest}</pre>
        </div>
      </section>
    </>
  );
}

function Registry({
  catalog,
  processors,
  processorTotal,
  dataState,
  account,
  networkReady,
  contractsReady,
  busy,
  onConnect,
  onSwitch,
  onRun,
}: {
  catalog: CircuitManifest[];
  processors: Processor[];
  processorTotal: number;
  dataState: "loading" | "live" | "unavailable";
  account: string;
  networkReady: boolean;
  contractsReady: boolean;
  busy: boolean;
  onConnect: () => void;
  onSwitch: () => void;
  onRun: (c: CircuitManifest, input: string) => void;
}) {
  const lang = useLanguage();
  const c = text[lang];
  const zh = lang === "zh";
  const [tab, setTab] = useState<"circuits" | "processors">("circuits");
  const [selected, setSelected] = useState<CircuitManifest | null>(
    catalog[0] || null,
  );
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!selected && catalog[0]) setSelected(catalog[0]);
  }, [catalog, selected]);
  const rows = useMemo(
    () =>
      processors.filter((p) =>
        `${p.name} ${p.address}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [processors, query],
  );
  return (
    <>
      <section className="page-heading">
        <div>
          <Status
            live={
              tab === "circuits"
                ? Boolean(catalog.length)
                : dataState === "live"
            }
          >
            {tab === "circuits"
              ? catalog.length
                ? `${catalog.length} ${zh ? "份已验证 Manifest" : "verified manifests"}`
                : c.configureRegistry
              : `${processorTotal.toLocaleString()} ${c.processors.toLowerCase()}`}
          </Status>
          <h1>
            {c.registryFor}
            <br />
            <em>{c.realCircuits}</em>
          </h1>
          <p>
            {zh
              ? "将协议发现与执行分开。每一行要么来自 TapeOut 公开数据，要么已经通过 X Layer Registry 验证。"
              : "Separate protocol discovery from execution. Every row is either sourced from TapeOut public data or verified from the deployed X Layer Registry."}
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="outline-button"
            onClick={() =>
              setTab(tab === "circuits" ? "processors" : "circuits")
            }
          >
            <RefreshCw size={15} />
            {tab === "circuits"
              ? zh
                ? "查看处理器"
                : "View processors"
              : zh
                ? "查看电路"
                : "View circuits"}
          </button>
        </div>
      </section>
      <div className="tab-bar">
        <button
          className={tab === "circuits" ? "active" : ""}
          onClick={() => setTab("circuits")}
        >
          <Layers3 size={15} />
          {c.published}
        </button>
        <button
          className={tab === "processors" ? "active" : ""}
          onClick={() => setTab("processors")}
        >
          <Gauge size={15} />
          {c.processors}
        </button>
        <label>
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={zh ? "按名称或地址搜索" : "Search by name or address"}
          />
        </label>
      </div>
      {tab === "circuits" ? (
        <div className="registry-layout">
          <div className="registry-list">
            {catalog.length ? (
              catalog.map((c) => (
                <button
                  key={c.id}
                  className={`registry-row ${selected?.id === c.id ? "selected" : ""}`}
                  onClick={() => setSelected(c)}
                >
                  <span className={`circuit-glyph ${c.accent}`}>{c.glyph}</span>
                  <span>
                    <b>{c.name}</b>
                    <small>{c.description}</small>
                    <em>
                      <Status live>{c.version}</Status> · {c.price} OKB / call
                    </em>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))
            ) : (
              <div className="empty-panel">
                <Layers3 size={24} />
                <h3>{c.noManifests}</h3>
                <p>{c.noManifestsDesc}</p>
              </div>
            )}
          </div>
          <CircuitInspector
            circuit={selected}
            account={account}
            networkReady={networkReady}
            contractsReady={contractsReady}
            busy={busy}
            onConnect={onConnect}
            onSwitch={onSwitch}
            onRun={onRun}
          />
        </div>
      ) : (
        <div className="processor-table">
          <div className="table-heading">
            <span>Processor</span>
            <span>{zh ? "创建者" : "Creator"}</span>
            <span>{zh ? "铸造进度" : "Mint completion"}</span>
            <span>{zh ? "电路数" : "Circuits"}</span>
            <span>{zh ? "链上凭证" : "Evidence"}</span>
          </div>
          {rows.map((p) => (
            <div className="table-row" key={p.address}>
              <div>
                <b>{p.name || shortAddress(p.address)}</b>
                <small>{shortAddress(p.address)}</small>
              </div>
              <span>{shortAddress(p.creator)}</span>
              <span>
                {p.minted && p.supplyCap
                  ? `${Math.round((Number(p.minted) / Number(p.supplyCap)) * 100)}%`
                  : "—"}
              </span>
              <strong>{p.circuitCount.toLocaleString()}</strong>
              <a
                href={`https://bscscan.com/address/${p.address}`}
                target="_blank"
                rel="noreferrer"
              >
                {zh ? "浏览器" : "Explorer"} <ExternalLink size={12} />
              </a>
            </div>
          ))}
          {!rows.length && (
            <EmptyState
              text={
                dataState === "loading"
                  ? zh
                    ? "正在读取处理器…"
                    : "Loading processors…"
                  : zh
                    ? "没有匹配的处理器"
                    : "No matching processors"
              }
            />
          )}
        </div>
      )}
    </>
  );
}

function CircuitInspector({
  circuit,
  account,
  networkReady,
  contractsReady,
  busy,
  onConnect,
  onSwitch,
  onRun,
}: {
  circuit: CircuitManifest | null;
  account: string;
  networkReady: boolean;
  contractsReady: boolean;
  busy: boolean;
  onConnect: () => void;
  onSwitch: () => void;
  onRun: (c: CircuitManifest, input: string) => void;
}) {
  const zh = useLanguage() === "zh";
  const [input, setInput] = useState("0x");
  if (!circuit)
    return (
      <div className="inspector empty-panel">
        <ShieldCheck size={24} />
        <h3>{zh ? "等待真实 Circuit 上线" : "Awaiting a live Circuit"}</h3>
        <p>
          {zh
            ? "发布真实 Manifest 后，这里会显示它的 schema、内容哈希和付费调用入口。"
            : "Once a real Manifest is published, its schema, hash and paid execution appear here."}
        </p>
      </div>
    );
  const valid = /^0x(?:[0-9a-fA-F]{2})*$/.test(input);
  return (
    <div className="inspector">
      <div className="inspector-title">
        <div className={`detail-glyph ${circuit.accent}`}>{circuit.glyph}</div>
        <div>
          <Status live>on-chain</Status>
          <h2>{circuit.name}</h2>
          <p>{circuit.description}</p>
        </div>
      </div>
      <div className="inspector-facts">
        <div>
          <small>Processor</small>
          <b>{shortAddress(circuit.processor)}</b>
        </div>
        <div>
          <small>Circuit ID</small>
          <b>#{circuit.circuitId.toString()}</b>
        </div>
        <div>
          <small>{zh ? "版本" : "Version"}</small>
          <b>{circuit.version}</b>
        </div>
        <div>
          <small>{zh ? "创建者" : "Creator"}</small>
          <b>{shortAddress(circuit.creator)}</b>
        </div>
      </div>
      <div className="schema-line">
        <span>
          <small>{zh ? "输入" : "INPUT"}</small>
          <code>{circuit.inputSchema}</code>
        </span>
        <ChevronRight size={15} />
        <span>
          <small>{zh ? "输出" : "OUTPUT"}</small>
          <code>{circuit.outputSchema}</code>
        </span>
      </div>
      <div className="call-box">
        <div>
          <span className="panel-kicker">
            <Play size={13} />
            {zh ? "付费执行" : "Paid execution"}
          </span>
          <label>
            {zh ? "输入字节" : "Input bytes"}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
            />
          </label>
          <small>
            {zh
              ? `固定价格：${circuit.price} OKB · 创建者 ${circuit.creatorShare}% · Processor ${circuit.processorShare}%`
              : `Exact price: ${circuit.price} OKB · creator ${circuit.creatorShare}% · processor ${circuit.processorShare}%`}
          </small>
        </div>
        {!account ? (
          <button className="primary-button" onClick={onConnect}>
            <Wallet size={15} />
            {zh ? "连接钱包" : "Connect wallet"}
          </button>
        ) : !networkReady ? (
          <button className="primary-button" onClick={onSwitch}>
            <Network size={15} />
            {zh ? "切换到 X Layer" : "Switch to X Layer"}
          </button>
        ) : !contractsReady ? (
          <button className="outline-button" disabled>
            <Settings2 size={15} />
            {zh ? "等待执行配置" : "Execution config pending"}
          </button>
        ) : (
          <button
            className="primary-button"
            disabled={!valid || busy}
            onClick={() => onRun(circuit, input)}
          >
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Play size={15} />
            )}
            {busy
              ? zh
                ? "提交中…"
                : "Submitting…"
              : zh
                ? `支付 ${circuit.price} OKB 执行`
                : `Run for ${circuit.price} OKB`}
          </button>
        )}
      </div>
      <div className="inspector-foot">
        <ShieldCheck size={14} />
        {zh
          ? "输入与输出承诺由 Router 记录。"
          : "Input and output commitments are recorded by the Router."}
        <a href={XLAYER_EXPLORER} target="_blank" rel="noreferrer">
          {zh ? "查看 X Layer 浏览器" : "X Layer explorer"}{" "}
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}

function Vaults({
  account,
  networkReady,
  vaultReady,
  position,
  busy,
  onConnect,
  onSwitch,
  onDeposit,
}: {
  account: string;
  networkReady: boolean;
  vaultReady: boolean;
  position: Position | null;
  busy: boolean;
  onConnect: () => void;
  onSwitch: () => void;
  onDeposit: (amount: string) => void;
}) {
  const zh = useLanguage() === "zh";
  const [amount, setAmount] = useState("0.01");
  return (
    <>
      <section className="page-heading compact">
        <div>
          <Status live={vaultReady}>
            {zh ? "结算资金容器" : "Settlement rail"}{" "}
            {vaultReady
              ? zh
                ? "已上线"
                : "rail live"
              : zh
                ? "需要部署"
                : "deployment required"}
          </Status>
          <h1>
            {zh ? "让项目" : "Project"}
            <br />
            <em>{zh ? "按结果完成结算。" : "settlement, by result."}</em>
          </h1>
          <p>
            {zh
              ? "为项目准备非托管 OKB 结算资金。业务 Circuit 的结果可以作为付款、退款或分账流程的触发依据。"
              : "Fund a non-custodial OKB rail for a project. A business Circuit result can become the trigger for payment, refund or split settlement."}
          </p>
        </div>
        <a
          className="outline-button as-link"
          href="https://github.com/yanwenzhe519-ctrl/tapeout-circuit-commons"
          target="_blank"
          rel="noreferrer"
        >
          <GitBranch size={15} />
          {zh ? "查看合约" : "Review contracts"}
        </a>
      </section>
      <section className="safety-banner">
        <ShieldCheck size={20} />
        <div>
          <b>{zh ? "可选的安全护栏" : "Optional safety guardrail"}</b>
          <span>
            {zh
              ? "风控能力只负责限额、白名单和暂停；项目结算本身由业务结果驱动。当前页面是结算模板，真实条件释放需要部署并验证对应合约。"
              : "Limits, allowlists and pause controls are optional guardrails. Project settlement is driven by the business result. This page is a settlement template until the matching release contract is deployed and verified."}
          </span>
        </div>
        <Status live={vaultReady}>
          {vaultReady
            ? zh
              ? "X Layer 已就绪"
              : "Ready on X Layer"
            : zh
              ? "等待合约地址"
              : "Awaiting addresses"}
        </Status>
      </section>
      <div className="vault-grid">
        <div className="panel vault-create">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {zh ? "起步结算模板" : "Starter settlement"}
              </span>
              <h2>{zh ? "里程碑托管容器" : "Milestone escrow rail"}</h2>
            </div>
            <span className="vault-badge">Settlement rail / v1</span>
          </div>
          <div className="policy-diagram">
            <PolicyStep label={zh ? "业务条件" : "Business rule"} value="Circuit result" />
            <ChevronRight />
            <PolicyStep
              label={zh ? "项目上限" : "Project cap"}
              value="≤ 10 OKB"
            />
            <ChevronRight />
            <PolicyStep
              label={zh ? "退款窗口" : "Refund window"}
              value={zh ? "24 小时" : "24 hours"}
            />
          </div>
          <div className="deposit-form">
            <label>
              {zh ? "存入金额" : "Deposit amount"}
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
              />
              <small>OKB</small>
            </label>
            {!account ? (
              <button className="primary-button" onClick={onConnect}>
                <Wallet size={15} />
                {zh ? "连接钱包" : "Connect wallet"}
              </button>
            ) : !networkReady ? (
              <button className="primary-button" onClick={onSwitch}>
                <Network size={15} />
                {zh ? "切换到 X Layer" : "Switch to X Layer"}
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={() => onDeposit(amount)}
                disabled={!vaultReady || busy}
              >
                <ArrowDownToLine size={15} />
                {busy
                  ? zh
                    ? "提交中…"
                    : "Submitting…"
                  : zh
                    ? "注入结算资金"
                    : "Fund settlement rail"}
              </button>
            )}
          </div>
          <div className="vault-note">
            <ShieldCheck size={14} />
            {zh
              ? "资金始终留在已配置的结算合约中，本页面不会要求代币授权。未配置真实地址时，执行按钮保持禁用。"
              : "Funds remain in the configured settlement contract. This page never asks for a token approval; execution stays disabled without a real address."}
          </div>
        </div>
        <div className="panel position-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {zh ? "你的结算仓位" : "Your settlement position"}
              </span>
              <h2>{zh ? "项目资金份额" : "Project funding share"}</h2>
            </div>
            <LineChart size={18} />
          </div>
          {position ? (
            <div className="position-live">
              <div>
                <small>{zh ? "可赎回本金" : "Principal claim"}</small>
                <strong>{position.pt} OKB</strong>
              </div>
              <div>
                <small>{zh ? "调用分成" : "Usage revenue"}</small>
                <strong>{position.claimable} OKB</strong>
              </div>
              <a href={XLAYER_EXPLORER} target="_blank" rel="noreferrer">
                {zh ? "在 X Layer 查看" : "View on X Layer"}{" "}
                <ExternalLink size={12} />
              </a>
            </div>
          ) : (
            <div className="empty-state tall">
              <CircleDollarSign size={22} />
              <span>
                {vaultReady
                  ? zh
                    ? "连接钱包并存入资金后，这里会生成你的仓位。"
                    : "Connect and deposit to create a position."
                  : zh
                    ? "结算容器部署后，这里才会显示仓位数据。"
                    : "Position data appears after the settlement rail is deployed."}
              </span>
            </div>
          )}
        </div>
      </div>
      <section className="section-callout quiet">
        <div>
          <span className="panel-kicker">
            {zh ? "经济模型" : "Economic model"}
          </span>
          <h2>
            {zh
              ? "收入来自真实调用，而不是增发。"
              : "Revenue comes from use, not emissions."}
          </h2>
          <p>
            {zh
              ? "资金来自真实项目调用和结算，不来自增发。CircuitSafe 只作为可选护栏，不把内部余额包装成可交易代币。"
              : "Funding comes from real project calls and settlement, not emissions. CircuitSafe remains an optional guardrail; internal balances are not marketed as tradable tokens."}
          </p>
        </div>
        <a
          href="https://tapeout.link/"
          target="_blank"
          rel="noreferrer"
          className="text-action"
        >
          {zh ? "对照 TapeOut 生态" : "Compare with the ecosystem"}{" "}
          <ArrowUpRight size={15} />
        </a>
      </section>
    </>
  );
}
function PolicyStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="policy-step">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}

function Ecosystem() {
  const zh = useLanguage() === "zh";
  const localized: Record<string, { category: string; description: string }> = {
    "TapeOut Protocol": {
      category: "官方协议",
      description:
        "设计 NAND 与 LATCH 电路，铸造晶体管，并将电路铸造成 Circuit NFT。",
    },
    TapeKit: {
      category: "DeWeb 工具",
      description: "开源 tape:// 网关，从链上读取容器并校验内容哈希。",
    },
    "TapeOut Work": {
      category: "数据与情报",
      description: "浏览 Processor、铸造进度、供应量和公开的电路数据。",
    },
    "TapeOut Market": {
      category: "市场",
      description: "查看 Circuit、晶体管和挖矿设备市场及公开订单数据。",
    },
    "TapeOut Intelligence": {
      category: "数据与情报",
      description:
        "浏览公开的 Processor 注册表、铸造活动、任务池和有证据支持的 API。",
    },
    "TapeHub.ai": {
      category: "项目启动台",
      description: "创建项目、铸造晶体管，并将流动性迁移到 PancakeSwap。",
    },
    "Circuit Commons": {
      category: "X Layer 应用层",
      description:
        "将 TapeOut Circuit 接入项目流程，按结果完成付款、退款、分账和链上凭证。",
    },
  };
  return (
    <>
      <section className="page-heading compact">
        <div>
          <Status live>
            {zh ? "公开链接已核验" : "Public links verified"}
          </Status>
          <h1>
            {zh ? "TapeOut" : "The TapeOut"}
            <br />
            <em>{zh ? "生态地图。" : "surface map."}</em>
          </h1>
          <p>
            {zh
              ? "在一个工作台里找到协议、数据、市场、DeWeb 与 X Layer 应用层，同时明确区分外部产品。"
              : "One place to find the protocol, data, markets, DeWeb and the X Layer application layer. External products stay clearly attributed."}
          </p>
        </div>
        <a
          className="outline-button as-link"
          href="https://tapeout.link/"
          target="_blank"
          rel="noreferrer"
        >
          <BookOpen size={15} />
          {zh ? "打开 TapeOut.link" : "Open TapeOut.link"}
        </a>
      </section>
      <div className="ecosystem-grid">
        {ecosystem.map((item) => (
          <a
            className="ecosystem-item"
            href={item.url}
            target="_blank"
            rel="noreferrer"
            key={item.name}
          >
            <div className={`ecosystem-icon ${item.accent}`}>
              <Globe2 size={18} />
            </div>
            <div>
              <span>
                {zh
                  ? (localized[item.name]?.category ?? item.category)
                  : item.category}{" "}
                ·{" "}
                {item.live
                  ? zh
                    ? "可用"
                    : "Live"
                  : zh
                    ? "待部署"
                    : "Deployment pending"}
              </span>
              <h2>{item.name}</h2>
              <p>
                {zh
                  ? (localized[item.name]?.description ?? item.description)
                  : item.description}
              </p>
            </div>
            <ArrowUpRight size={16} />
          </a>
        ))}
      </div>
      <section className="data-contract">
        <div>
          <span className="panel-kicker">
            {zh ? "数据边界" : "Data boundary"}
          </span>
          <h2>
            {zh
              ? "真实数据可以读取，未配置的合约不会被虚构。"
              : "Live sources are readable. Unconfigured contracts are not invented."}
          </h2>
          <p>
            {zh
              ? "TapeOut 公开注册表数据来自官方 API。Circuit Commons 只有在配置 X Layer Registry 与 Router 地址，并能读取链上事件后，才会显示为线上数据。"
              : "Public TapeOut registry data is fetched from its published API. Circuit Commons data only becomes live after the X Layer Registry and Router addresses are configured and their events can be read."}
          </p>
        </div>
        <div className="source-list">
          <span>
            <Check size={14} />
            {zh
              ? "TapeOut 公开 Processor API"
              : "TapeOut public processors API"}
          </span>
          <span>
            <Check size={14} />
            {zh ? "TapeOut.link 生态目录" : "TapeOut.link ecosystem directory"}
          </span>
          <span>
            <Check size={14} />
            {zh ? "X Layer Registry 事件" : "X Layer Registry events"}
          </span>
          <span>
            <Check size={14} />
            {zh ? "Router UsageReceipt 事件" : "Router UsageReceipt events"}
          </span>
        </div>
      </section>
    </>
  );
}

function Developers() {
  const zh = useLanguage() === "zh";
  const [copied, setCopied] = useState(false);
  const snippet = `import { createCircuitClient } from '@circuit-commons/sdk'\n\nconst client = createCircuitClient({\n  chain: 'xlayer',\n  router: '0x…',\n})\n\nawait client.run({\n  circuitId: 42n,\n  inputs: '0x0101',\n  value: '0.0001',\n})`;
  return (
    <>
      <section className="page-heading compact">
        <div>
          <Status live>
            {zh ? "开放集成入口" : "Open integration surface"}
          </Status>
          <h1>
            {zh ? "让 Circuit" : "Ship a Circuit"}
            <br />
            <em>{zh ? "一个下午即可接入。" : "in an afternoon."}</em>
          </h1>
          <p>
            {zh
              ? "Registry Manifest 让 Circuit 可被发现，Router 让它可被调用，UsageReceipt 让每次调用可审计。用户体验由你的应用掌控。"
              : "Registry manifests make a Circuit discoverable. The Router makes it callable. Receipts make it auditable. Your app owns the user experience."}
          </p>
        </div>
        <a
          className="outline-button as-link"
          href="https://github.com/yanwenzhe519-ctrl/tapeout-circuit-commons"
          target="_blank"
          rel="noreferrer"
        >
          <GitBranch size={15} />
          {zh ? "查看 GitHub" : "View GitHub"}
        </a>
      </section>
      <div className="developer-layout">
        <div className="panel docs-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {zh ? "集成路径" : "Integration path"}
              </span>
                <h2>
                {zh ? "四步接入，一次结算" : "Four steps, one settlement"}
              </h2>
            </div>
            <Code2 size={18} />
          </div>
          <DocRow
            number="01"
            title={zh ? "定义业务规则" : "Define the business rule"}
            text={
              zh
                ? "将 Circuit 的输入、输出、版本、价格和项目结算条件写入可验证 Manifest。"
                : "Describe the Circuit inputs, outputs, version, price and settlement condition in a verifiable Manifest."
            }
          />
          <DocRow
            number="02"
            title={zh ? "接入项目流程" : "Connect the project flow"}
            text={
              zh
                ? "项目后端或前端通过 Router 提交输入，调用方只需签名，资金不经过平台私钥。"
                : "A project frontend or backend submits inputs through the Router. Callers sign from their wallet; no platform key moves funds."
            }
          />
          <DocRow
            number="03"
            title={zh ? "验证结果" : "Verify the result"}
            text={
              zh
                ? "读取 UsageReceipt，核对调用者、输入承诺、结果承诺、金额和版本。"
                : "Read UsageReceipt to verify the caller, input commitment, result commitment, amount and version."
            }
          />
          <DocRow
            number="04"
            title={zh ? "完成条件结算" : "Settle the outcome"}
            text={
              zh
                ? "根据结果释放付款、退款或分账；需要时再叠加额度、白名单和暂停护栏。"
                : "Release payment, refund or split based on the result, then add limits, allowlists or pause controls when needed."
            }
          />
        </div>
        <div className="panel code-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {zh ? "参考客户端" : "Reference client"}
              </span>
              <h2>{zh ? "一次钱包签名调用" : "One signed call"}</h2>
            </div>
            <button
              className="icon-button"
              title={zh ? "复制代码" : "Copy code"}
              aria-label={zh ? "复制代码" : "Copy code"}
              onClick={() => {
                navigator.clipboard?.writeText(snippet);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <pre>
            <code>{snippet}</code>
          </pre>
          <div className="code-foot">
            <span>
              <ShieldCheck size={13} />
              {zh ? "私钥不会离开钱包" : "No private key leaves the wallet"}
            </span>
            <span>viem · TypeScript</span>
          </div>
        </div>
      </div>
      <div className="developer-links">
        <a
          href="https://github.com/yanwenzhe519-ctrl/tapeout-circuit-commons/blob/master/README.md"
          target="_blank"
          rel="noreferrer"
        >
          <BookOpen size={17} />
          <span>
            <b>{zh ? "阅读上线检查清单" : "Read the production checklist"}</b>
            <small>
              {zh
                ? "Processor ABI、所有权适配器、部署校验器"
                : "Processor ABI, ownership adapter, deployment verifier"}
            </small>
          </span>
          <ArrowUpRight size={15} />
        </a>
        <a
          href="https://www.oklink.com/xlayer"
          target="_blank"
          rel="noreferrer"
        >
          <Network size={17} />
          <span>
            <b>{zh ? "查看 X Layer" : "Inspect X Layer"}</b>
            <small>
              {zh
                ? "Chain 196 · OKB 结算 · 公开浏览器"
                : "Chain 196 · OKB settlement · public explorer"}
            </small>
          </span>
          <ArrowUpRight size={15} />
        </a>
      </div>
    </>
  );
}

function AdminLaunch({
  account,
  networkReady,
  contractsReady,
  onConnect,
  onSwitch,
}: {
  account: string;
  networkReady: boolean;
  contractsReady: boolean;
  onConnect: () => void;
  onSwitch: () => void;
}) {
  const zh = useLanguage() === "zh";
  const [checks, setChecks] = useState<Awaited<ReturnType<typeof readDeploymentChecks>>>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deploymentMessage, setDeploymentMessage] = useState("");
  const adminMatches = Boolean(adminWalletAddress && account && adminWalletAddress.toLowerCase() === account.toLowerCase());
  async function verify() {
    setLoading(true);
    try {
      setChecks(await readDeploymentChecks());
      setChecked(true);
    } finally {
      setLoading(false);
    }
  }
  const readyCount = checks.filter((check) => check.configured && check.onChain).length;
  async function deployFromWallet() {
    if (!account) return onConnect();
    if (!networkReady) return onSwitch();
    if (adminWalletAddress && !adminMatches) {
      setDeploymentMessage(zh ? "当前钱包不是配置的管理员钱包。请切换到管理员账户后再部署。" : "The connected wallet is not the configured admin wallet. Switch accounts before deploying.");
      return;
    }
    setDeploying(true);
    setDeploymentMessage("");
    try {
      const result = await deployProtocolFromWallet(account, processorRecipientAddress || account, account);
      setDeploymentMessage(zh ? `部署完成：Registry ${shortAddress(result.registry)}，Router ${shortAddress(result.router)}，Factory ${shortAddress(result.factory)}` : `Deployed: Registry ${shortAddress(result.registry)}, Router ${shortAddress(result.router)}, Factory ${shortAddress(result.factory)}`);
      await verify();
    } catch (error) {
      setDeploymentMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setDeploying(false);
    }
  }
  return (
    <>
      <section className="page-heading compact">
        <div>
          <Status live={contractsReady}>{zh ? "管理员上线向导" : "Admin launch wizard"}</Status>
          <h1>{zh ? "一次配置，所有用户" : "Configure once."}<br /><em>{zh ? "无需终端。" : "No terminal for users."}</em></h1>
          <p>{zh ? "管理员只负责部署和校验共享协议合约。普通用户只需要连接钱包、选择 Circuit 并确认交易。私钥不会进入网站。" : "The admin verifies shared protocol contracts once. Users only connect a wallet, choose a Circuit and confirm transactions. Private keys never enter the site."}</p>
        </div>
        <div className="heading-actions">
          {!account ? <button className="primary-button" onClick={onConnect}><Wallet size={15} />{zh ? "连接管理员钱包" : "Connect admin wallet"}</button> : !networkReady ? <button className="primary-button" onClick={onSwitch}><Network size={15} />{zh ? "切换到 X Layer" : "Switch to X Layer"}</button> : <><button className="primary-button" onClick={deployFromWallet} disabled={deploying || contractsReady}><PackageOpen size={15} />{deploying ? (zh ? "等待钱包确认…" : "Confirm in wallet…") : contractsReady ? (zh ? "协议已部署" : "Protocol deployed") : (zh ? "用钱包部署协议" : "Deploy with wallet")}</button><button className="outline-button" onClick={verify} disabled={loading}><RefreshCw size={15} />{loading ? (zh ? "校验中…" : "Checking…") : (zh ? "校验链上部署" : "Verify deployment")}</button></>}
        </div>
      </section>
      <div className="developer-layout">
        <div className="panel docs-panel">
          <div className="panel-heading"><div><span className="panel-kicker">{zh ? "管理员职责" : "ADMIN RESPONSIBILITY"}</span><h2>{zh ? "上线顺序" : "Launch order"}</h2></div><Settings2 size={18} /></div>
          {[
            ["01", zh ? "部署 Registry、Router、Factory" : "Deploy Registry, Router and Factory"],
            ["02", zh ? "把真实地址写入生产环境变量" : "Publish the real addresses to production env"],
            ["03", zh ? "校验 X Layer 字节码和 TapeOut 绑定" : "Verify X Layer bytecode and TapeOut bindings"],
            ["04", zh ? "开启真实调用，再开放普通用户" : "Enable paid calls only after smoke tests"],
          ].map(([number, title]) => <DocRow key={number} number={number} title={title} text={zh ? "由部署钱包签名；浏览器不保存私钥。" : "Signed by the deployment wallet; the browser never stores a private key."} />)}
        </div>
        <div className="panel code-panel">
          <div className="panel-heading"><div><span className="panel-kicker">{zh ? "生产门槛" : "PRODUCTION GATE"}</span><h2>{zh ? "当前状态" : "Current status"}</h2></div><ShieldCheck size={18} /></div>
          <div className="pod-checks">
            <div className="pod-check"><span className={adminMatches ? "ready" : "pending"}>{adminMatches ? <Check size={13} /> : <span />}</span><b>{zh ? "管理员钱包" : "Admin wallet"}</b><small>{adminWalletAddress ? (adminMatches ? (zh ? "匹配" : "Matched") : (zh ? "不匹配" : "Mismatch")) : (zh ? "未配置白名单" : "Allowlist not configured")}</small></div>
            <div className="pod-check"><span className={networkReady ? "ready" : "pending"}>{networkReady ? <Check size={13} /> : <span />}</span><b>X Layer · 196</b><small>{networkReady ? (zh ? "已连接" : "Connected") : (zh ? "待切换" : "Switch required")}</small></div>
            <div className="pod-check"><span className={contractsReady ? "ready" : "pending"}>{contractsReady ? <Check size={13} /> : <span />}</span><b>{zh ? "前端配置" : "Frontend configuration"}</b><small>{contractsReady ? (zh ? "完整" : "Complete") : (zh ? "地址缺失" : "Addresses missing")}</small></div>
          </div>
          {deploymentMessage && <p className="pod-disclaimer">{deploymentMessage}</p>}
          {checked ? <div className="admin-results"><strong>{readyCount}/{checks.length} {zh ? "项已验证" : "checks verified"}</strong>{checks.map((check) => <div className="pod-check" key={check.key}><span className={check.configured && check.onChain ? "ready" : "pending"}>{check.configured && check.onChain ? <Check size={13} /> : <AlertTriangle size={13} />}</span><b>{check.label}</b><small>{check.detail}</small></div>)}</div> : <p className="pod-disclaimer">{zh ? "部署按钮会依次请求 Registry、Router、Factory 和 Registry.setFactory 四次钱包确认。私钥不会进入网站。" : "Deploy requests four wallet confirmations: Registry, Router, Factory and Registry.setFactory. No private key enters the site."}</p>}
        </div>
      </div>
    </>
  );
}
function DocRow({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="doc-row">
      <span>{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <ChevronRight size={16} />
    </div>
  );
}

function ActivityPage({
  receipts,
  dataState,
}: {
  receipts: UsageReceipt[];
  dataState: "loading" | "live" | "unavailable";
}) {
  const zh = useLanguage() === "zh";
  return (
    <>
      <section className="page-heading compact">
        <div>
          <Status live={Boolean(receipts.length)}>
            {zh ? "事件索引 " : "Event index "}
            {receipts.length
              ? zh
                ? "已连接"
                : "connected"
              : zh
                ? "等待中"
                : "pending"}
          </Status>
          <h1>
            {zh ? "用证据" : "Proof over"}
            <br />
            <em>{zh ? "取代承诺。" : "promises."}</em>
          </h1>
          <p>
            {zh
              ? "Router 收据是 Circuit 使用情况的唯一依据。本页面不会伪造交易历史。"
              : "Router receipts are the source of truth for Circuit usage. This view never fabricates a transaction history."}
          </p>
        </div>
        <a
          className="outline-button as-link"
          href={XLAYER_EXPLORER}
          target="_blank"
          rel="noreferrer"
        >
          <Network size={15} />
          {zh ? "打开 X Layer 浏览器" : "Open X Layer explorer"}
        </a>
      </section>
      <div className="activity-toolbar">
        <span>
          <ReceiptText size={16} />
          {zh ? "UsageReceipt 事件" : "UsageReceipt events"}
        </span>
        <span>
          {dataState === "loading"
            ? zh
              ? "同步中…"
              : "Syncing…"
            : `${receipts.length} ${zh ? "条已索引" : "indexed"}`}
        </span>
      </div>
      <div className="activity-table">
        <div className="table-heading">
          <span>{zh ? "收据" : "Receipt"}</span>
          <span>Circuit</span>
          <span>{zh ? "金额" : "Amount"}</span>
          <span>{zh ? "时间" : "Timestamp"}</span>
          <span>{zh ? "交易" : "Transaction"}</span>
        </div>
        {receipts.length ? (
          receipts.map((r) => (
            <div className="table-row" key={r.id}>
              <b>{r.id}</b>
              <span>{r.circuit}</span>
              <span>{r.amount}</span>
              <span>{r.timestamp}</span>
              <a
                href={`${XLAYER_EXPLORER}/tx/${r.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(r.txHash)} <ExternalLink size={12} />
              </a>
            </div>
          ))
        ) : (
          <div className="empty-panel">
            <ReceiptText size={24} />
            <h3>
              {routerAddress
                ? zh
                  ? "当前索引范围内没有收据"
                  : "No receipts in the indexed window"
                : zh
                  ? "Router 尚未配置"
                  : "Router not configured"}
            </h3>
            <p>
              {routerAddress
                ? zh
                  ? "真实的付费 Circuit 调用确认后，会出现在这里。"
                  : "A real paid Circuit call will appear here after confirmation."
                : zh
                  ? "设置 X Layer Router 地址后，才能读取已验证的 UsageReceipt 事件。"
                  : "Set the X Layer Router address to read verified UsageReceipt events."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function Publish({
  account,
  onConnect,
  configReady,
  busy,
  onPublish,
}: {
  account: string;
  onConnect: () => void;
  configReady: boolean;
  busy: boolean;
  onPublish: (input: Parameters<typeof publishCircuit>[0]) => void;
}) {
  const zh = useLanguage() === "zh";
  const [draft, setDraft] = useState({
    circuitId: import.meta.env.VITE_CIRCUIT_ID || "1",
    name: "Circuit Commons Pod Controller",
    version: "1.0.1",
    inputSchema: "owner_verified:bool, container_opened:bool, manifest_active:bool, revenue_configured:bool, service_live:bool, assets_bound:bool, handoff_requested:bool, new_owner_verified:bool, old_owner_revoked:bool, risk_clear:bool, emergency_pause:bool, settlement_ready:bool, treasury_ready:bool",
    outputSchema: "pod_ready:bool, allow_call:bool, allow_settlement:bool, allow_handoff:bool, freeze_project:bool",
    manifestURI: "https://yanwenzhe519-ctrl.github.io/tapeout-circuit-commons/manifests/circuit-1-v1.0.1.json",
    price: "0.0000001",
    creatorBps: 8000,
    processorBps: 1500,
  });
  const valid = Boolean(
    draft.circuitId &&
    draft.name &&
    draft.inputSchema &&
    draft.outputSchema &&
    draft.manifestURI &&
    draft.creatorBps + draft.processorBps <= 10000,
  );
  return (
    <>
      <section className="page-heading compact">
        <div>
          <Status live={configReady}>
            {zh ? "所有者授权发布" : "Owner-gated publishing"}
          </Status>
          <h1>
            {zh ? "发布一块" : "Publish a"}
            <br />
            <em>{zh ? "真实 Circuit。" : "real Circuit."}</em>
          </h1>
          <p>
            {zh
              ? "导出准确的 Manifest 并以不可变方式托管，再将所有权和经济规则绑定到已部署的 X Layer Registry。"
              : "Export the exact Manifest, host it immutably, then bind ownership and economics to the deployed X Layer Registry."}
          </p>
        </div>
        <a
          className="outline-button as-link"
          href="https://tapeout.net/"
          target="_blank"
          rel="noreferrer"
        >
          <BookOpen size={15} />
          {zh ? "打开 TapeOut 画布" : "TapeOut canvas"}
        </a>
      </section>
      <div className="publish-layout">
        <form
          className="panel publish-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && account) onPublish(draft);
          }}
        >
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Manifest v1</span>
              <h2>{zh ? "授权详情" : "License details"}</h2>
            </div>
            <FileKey2 size={18} />
          </div>
          <label>
            Circuit ID
            <input
              required
              value={draft.circuitId}
              onChange={(e) =>
                setDraft({ ...draft, circuitId: e.target.value })
              }
              placeholder="TapeOut Circuit ID"
            />
          </label>
          <label>
            {zh ? "名称" : "Name"}
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. LIMIT-GUARD-8"
            />
          </label>
          <div className="form-two">
            <label>
              {zh ? "版本" : "Version"}
              <input
                required
                value={draft.version}
                onChange={(e) =>
                  setDraft({ ...draft, version: e.target.value })
                }
              />
            </label>
            <label>
              {zh ? "单次价格" : "Price / call"}
              <input
                required
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              />
              <small>OKB</small>
            </label>
          </div>
          <label>
            {zh ? "输入 schema" : "Input schema"}
            <textarea
              required
              rows={2}
              value={draft.inputSchema}
              onChange={(e) =>
                setDraft({ ...draft, inputSchema: e.target.value })
              }
              placeholder="amount:uint64, approvals:uint8"
            />
          </label>
          <label>
            {zh ? "输出 schema" : "Output schema"}
            <textarea
              required
              rows={2}
              value={draft.outputSchema}
              onChange={(e) =>
                setDraft({ ...draft, outputSchema: e.target.value })
              }
              placeholder="allowed:bool, reason:uint8"
            />
          </label>
          <label>
            {zh ? "不可变 Manifest URI" : "Immutable Manifest URI"}
            <input
              required
              value={draft.manifestURI}
              onChange={(e) =>
                setDraft({ ...draft, manifestURI: e.target.value })
              }
              placeholder="ipfs://… or https://…"
            />
            <small className="field-note">
              {zh
                ? "必须直接返回与本表单完全一致的 JSON。当前已填入项目托管的 Circuit #1 Manifest。"
                : "Must return JSON that exactly matches this form. The hosted Circuit #1 Manifest is prefilled."}
            </small>
          </label>
          <div className="form-two">
            <label>
              {zh ? "创建者分成" : "Creator share"}
              <input
                type="number"
                min="0"
                max="10000"
                value={draft.creatorBps}
                onChange={(e) =>
                  setDraft({ ...draft, creatorBps: Number(e.target.value) })
                }
              />
              <small>{zh ? "基点" : "basis points"}</small>
            </label>
            <label>
              {zh ? "Processor 分成" : "Processor share"}
              <input
                type="number"
                min="0"
                max="10000"
                value={draft.processorBps}
                onChange={(e) =>
                  setDraft({ ...draft, processorBps: Number(e.target.value) })
                }
              />
              <small>{zh ? "基点" : "basis points"}</small>
            </label>
          </div>
          {!account ? (
            <button
              type="button"
              className="primary-button full"
              onClick={onConnect}
            >
              <Wallet size={15} />
              {zh ? "连接 Circuit 所有者钱包" : "Connect circuit owner wallet"}
            </button>
          ) : (
            <button
              type="submit"
              className="primary-button full"
              disabled={!valid || !configReady || busy}
            >
              {busy ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                <FileKey2 size={15} />
              )}
              {!configReady
                ? zh
                  ? "需要部署配置"
                  : "Deployment config required"
                : zh
                  ? "验证所有权并发布"
                  : "Verify owner & publish"}
            </button>
          )}
        </form>
        <aside className="panel publish-aside">
          <ShieldCheck size={22} />
          <h3>{zh ? "会校验什么？" : "What is verified?"}</h3>
          <p>
            {zh
              ? "合约会将当前钱包与 TapeOut 的 canonical ownerOf(Circuit ID) 对照。Registry 保存内容哈希、URI、准确价格和分成规则，任何人都可以重新获取同一份 JSON 并自行校验哈希。"
              : "The contract checks the connected wallet against TapeOut's canonical ownerOf(Circuit ID). The Registry stores the hash, URI, exact price and split. Readers can independently re-fetch and hash the same JSON."}
          </p>
          <div className="check-list">
            <span>
              <Check size={14} />
              {zh ? "所有权预检" : "Owner preflight"}
            </span>
            <span>
              <Check size={14} />
              {zh ? "内容哈希" : "Content hash"}
            </span>
            <span>
              <Check size={14} />
              {zh ? "固定价格调用" : "Exact-price calls"}
            </span>
            <span>
              <Check size={14} />
              {zh ? "可提取分账" : "Pull-payment splits"}
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}
