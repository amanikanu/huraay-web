/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_AI_ENDPOINT: string;
  readonly VITE_APP_URL: string;
  readonly VITE_BUSINESS_BANK_NAME?: string;
  readonly VITE_BUSINESS_ACCOUNT_NUMBER?: string;
  readonly VITE_BUSINESS_ACCOUNT_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_AI_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.png" {
  const source: string;
  export default source;
}
