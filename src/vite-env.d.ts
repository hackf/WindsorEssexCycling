/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BROUTER_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
