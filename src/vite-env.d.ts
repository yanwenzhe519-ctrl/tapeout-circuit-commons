/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_XLAYER_RPC_URL?: string
  readonly VITE_REGISTRY_ADDRESS?: string
  readonly VITE_ROUTER_ADDRESS?: string
  readonly VITE_TAPEOUT_PROCESSOR_ADDRESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
    on?: (event: string, handler: (...args: unknown[]) => void) => void
    removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
  }
}
