// ─────────────────────────────────────────────────────────────────────────────
// MiniMax chat client — the single place this app talks to an LLM.
//
// MiniMax exposes an OpenAI-compatible /chat/completions endpoint, so this is a
// plain fetch with no SDK. Config matches the other GEA projects:
//   MINIMAX_API_KEY   — required; callers surface a config error without one
//   MINIMAX_BASE_URL  — default https://api.minimax.io/v1
//   MINIMAX_MODEL     — default MiniMax-M2
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://api.minimax.io/v1'
const DEFAULT_MODEL = 'MiniMax-M2'
const DEFAULT_TIMEOUT_MS = 30_000

export interface ChatOptions {
  system: string
  user: string
  /** Reasoning tokens are spent before the answer — leave room for both. */
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
}

/** True when a MiniMax key is configured; lets callers skip work rather than throw. */
export function isConfigured(): boolean {
  return !!process.env.MINIMAX_API_KEY
}

/**
 * MiniMax-M2 is a reasoning model: it emits inline <think>…</think> traces
 * ahead of the answer. Only those tags are removed — response markup such as
 * the <p> tags in a generated email is left untouched.
 */
export function stripReasoning(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim()
}

export async function chatCompletion(options: ChatOptions): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) {
    throw new Error(
      'MINIMAX_API_KEY environment variable is not set. ' +
        'Set it in .env (and on Railway) to enable AI generation.'
    )
  }

  const baseUrl = process.env.MINIMAX_BASE_URL || DEFAULT_BASE_URL
  const model = process.env.MINIMAX_MODEL || DEFAULT_MODEL

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.user },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4000,
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.error?.message || body?.base_resp?.status_msg || response.statusText
    throw new Error(`MiniMax error (${response.status}): ${detail}`)
  }

  const data = await response.json()
  // MiniMax reports business errors in base_resp with HTTP 200.
  if (data?.base_resp?.status_code && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax error: ${data.base_resp.status_msg || 'unknown'}`)
  }

  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('MiniMax returned an empty response')
  }

  return stripReasoning(content)
}
