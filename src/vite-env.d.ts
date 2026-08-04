/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  /** 쉼표로 구분된 허용 Gmail (예: you@gmail.com) */
  readonly VITE_ALLOWED_EMAILS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
