/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_XLAYER_RPC_URL?: string
  readonly VITE_REGISTRY_ADDRESS?: string
  readonly VITE_ROUTER_ADDRESS?: string
  readonly VITE_TAPEOUT_PROCESSOR_ADDRESS?: string
  readonly VITE_REVENUE_VAULT_ADDRESS?: string
  readonly VITE_PROCESSOR_RECIPIENT_ADDRESS?: string
  readonly VITE_POD_ACCOUNT_ADDRESS?: string
  readonly VITE_TAPEOUT_OWNERSHIP_ADAPTER_ADDRESS?: string
  readonly VITE_TAPEOUT_CONTAINER_ADAPTER_ADDRESS?: string
  readonly VITE_TAPEOUT_CONTAINER_ADDRESS?: string
  readonly VITE_CIRCUIT_ID?: string
  readonly VITE_ADMIN_WALLET_ADDRESS?: string
  readonly VITE_ENABLE_BROWSER_DEPLOY?: string
  readonly VITE_TAPEKIT_SITE_REGISTRY_ADDRESS?: string
  readonly VITE_TAPEKIT_DOMAIN_BINDING_ADDRESS?: string
  readonly VITE_TAPEOUT_PROCESSOR_INDEX?: string
  readonly VITE_TAPEKIT_GATEWAY?: string
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
