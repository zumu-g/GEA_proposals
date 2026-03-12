/**
 * Standalone cron runner — runs the inbox poller outside of Next.js.
 * Usage: npx tsx scripts/cron-runner.ts
 *
 * Loads .env.local for environment variables, starts the cron scheduler,
 * and keeps the process alive until terminated (Ctrl+C).
 */

import fs from 'fs'
import path from 'path'

// Manual .env.local loader (avoids dotenv dependency)
function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnvFile(path.resolve(__dirname, '..', '.env.local'))
loadEnvFile(path.resolve(__dirname, '..', '.env'))

// Dynamic import after env vars are loaded
async function main() {
  const { startCron, stopCron, getCronStatus } = await import('../src/lib/cron')

  console.log('=== GEA Proposals — Cron Runner ===')
  console.log(`AgentMail inbox: ${process.env.AGENTMAIL_INBOX || '(not set)'}`)
  console.log(`AgentMail API key: ${process.env.AGENTMAIL_API_KEY ? '***set***' : '(not set)'}`)
  console.log('')

  startCron()

  // Log status every 15 minutes
  setInterval(() => {
    const status = getCronStatus()
    console.log(
      `[${new Date().toISOString()}] [runner] Status: polls=${status.pollCount}, ` +
        `lastPoll=${status.lastPollTime || 'never'}, ` +
        `lastResult=${status.lastPollResult ? JSON.stringify(status.lastPollResult) : 'none'}`
    )
  }, 15 * 60 * 1000)

  // Graceful shutdown
  function shutdown() {
    console.log('\nShutting down cron runner...')
    stopCron()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Keep the process alive
  process.stdin.resume()
}

main().catch((err) => {
  console.error('Cron runner failed to start:', err)
  process.exit(1)
})
