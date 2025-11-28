/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_OTEL_COLLECTOR_URL: string;
    readonly MODE: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
