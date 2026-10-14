import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const commit = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7)
const builtOn = new Date().toISOString().slice(0, 10)

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(commit ? `${builtOn} (${commit})` : builtOn),
  },
  test: {
    environment: 'node',
  },
})
