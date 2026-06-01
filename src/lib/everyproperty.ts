// ─────────────────────────────────────────────────────────────────────────────
// everypropertyAI data access
//
// Thin wrapper over the `everypropertyai` CLI (a separate, already-built tool that
// wraps the PropertyIQ HTTP API and prints JSON). We shell out and parse the
// result — we do NOT reimplement any PropertyIQ logic here.
//
// The CLI reads its base URL from EVERYPROPERTY_API_URL (default
// http://localhost:3007) and an optional EVERYPROPERTY_API_TOKEN bearer. Those are
// forwarded to the child process so the URL is never hardcoded. If the global
// `everypropertyai` binary isn't on PATH, set EVERYPROPERTY_CLI_BIN to the absolute
// path of its built dist/cli.js (run via the current node).
//
// Note: `proposal` runs the full property pipeline — an uncached address can take
// up to ~120s (live crawl); cached addresses return in <2s.
// ─────────────────────────────────────────────────────────────────────────────

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const DEFAULT_API_URL = 'http://localhost:3007'
const TIMEOUT_MS = 150_000 // generous — uncached proposal can take ~120s
const MAX_BUFFER = 16 * 1024 * 1024 // hero photo lists + descriptions can be large

// ─── Returned shape (ProposalPropertyData) — any field may be absent/empty ───
export interface ProposalPriceEstimate {
  low?: number
  mid?: number
  high?: number
  source?: string
}

export interface ProposalPropertyData {
  address: string
  addressSlug?: string
  bedrooms?: number
  bathrooms?: number
  carSpaces?: number
  landAreaSqm?: number
  propertyType?: string
  priceEstimate?: ProposalPriceEstimate | null
  formattedEstimate?: string
  agency?: string
  agentName?: string
  heroPhotos?: string[]
  suburb?: string
  description?: string
  confidence?: number
}

export interface AddressSuggestion {
  streetAddress?: string
  suburb?: string
  state?: string
  postcode?: string
  fullAddress?: string
  display?: string
  placeId?: string
}

// ─── CLI invocation ──────────────────────────────────────────────────────────
function cliEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    EVERYPROPERTY_API_URL: process.env.EVERYPROPERTY_API_URL || DEFAULT_API_URL,
    ...(process.env.EVERYPROPERTY_API_TOKEN
      ? { EVERYPROPERTY_API_TOKEN: process.env.EVERYPROPERTY_API_TOKEN }
      : {}),
  }
}

// Resolves the binary + leading args. `execFile` with an args array means the
// address/query is passed as a literal argument — never shell-interpolated.
function resolveCli(): { cmd: string; baseArgs: string[] } {
  const override = process.env.EVERYPROPERTY_CLI_BIN
  if (override) return { cmd: process.execPath, baseArgs: [override] }
  return { cmd: 'everypropertyai', baseArgs: [] }
}

async function runCli(args: string[]): Promise<unknown> {
  const { cmd, baseArgs } = resolveCli()
  const apiUrl = process.env.EVERYPROPERTY_API_URL || DEFAULT_API_URL
  try {
    const { stdout } = await execFileAsync(cmd, [...baseArgs, ...args], {
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      env: cliEnv(),
    })
    try {
      return JSON.parse(stdout)
    } catch {
      throw new Error(`everypropertyai returned non-JSON output: ${stdout.slice(0, 300)}`)
    }
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      throw new Error(
        'everypropertyai CLI not found. Ensure it is `npm link`ed (global `everypropertyai`) ' +
          'or set EVERYPROPERTY_CLI_BIN to its built dist/cli.js.'
      )
    }
    if (err?.killed || err?.signal === 'SIGTERM') {
      throw new Error(`everypropertyai timed out after ${TIMEOUT_MS / 1000}s (address may be uncached).`)
    }
    const stderr = typeof err?.stderr === 'string' ? err.stderr.trim() : ''
    if (/ECONNREFUSED|fetch failed|ENOTFOUND|connect/i.test(stderr)) {
      throw new Error(`PropertyIQ not reachable at EVERYPROPERTY_API_URL (${apiUrl}). Is it running?`)
    }
    throw new Error(`everypropertyai failed: ${stderr || err?.message || 'unknown error'}`)
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/** Presentation-ready property data for a confirmed address (wraps `proposal`). */
export async function getProposalData(address: string): Promise<ProposalPropertyData> {
  const trimmed = address?.trim()
  if (!trimmed) throw new Error('address is required')
  const data = (await runCli(['proposal', trimmed])) as ProposalPropertyData
  if (!data || typeof data !== 'object') {
    throw new Error('everypropertyai proposal returned no data')
  }
  return data
}

/** Address suggestions for a partial query (wraps `search`). */
export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query?.trim()
  if (!trimmed) return []
  const data = (await runCli(['search', trimmed])) as { suggestions?: AddressSuggestion[] }
  return Array.isArray(data?.suggestions) ? data.suggestions : []
}
