import { defineConfig } from 'vitest/config'

// Las pruebas son de la lógica pura: no necesitan los plugins de Svelte ni de Cloudflare.
export default defineConfig({ test: { include: ['compartido/**/*.test.ts'] } })
