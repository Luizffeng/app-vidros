import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    /** Build date (YYYY-MM-DD), shown as "Última atualização" on Início. */
    __APP_VERSION__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  test: {
    environment: 'node',
  },
})
