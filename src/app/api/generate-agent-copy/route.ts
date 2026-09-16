import { NextResponse } from 'next/server'
import { generateAgentCopy, type AgentCopyContext } from '@/lib/agent-copy'
import { getEffectiveConfig } from '@/lib/user-profile'
import { getAgencyConfig } from '@/lib/proposal-generator'
import { getCurrentUser } from '@/lib/current-user'

// POST /api/generate-agent-copy — drafts the "your agent" bio and the
// vendor-specific introduction for one proposal. Auth-gated via middleware:
// it spends API credits, so it is not a public route.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.propertyAddress) {
      return NextResponse.json({ error: 'propertyAddress is required' }, { status: 400 })
    }

    // Agent identity comes from the signed-in user's profile, never the client
    // payload — the browser supplies proposal context only.
    const currentUser = await getCurrentUser()
    const config = currentUser
      ? await getEffectiveConfig(currentUser.email)
      : await getAgencyConfig()

    const context: AgentCopyContext = {
      agentName: config.agentName || config.name,
      agentTitle: config.agentTitle,
      agentYearsExperience: config.agentYearsExperience,
      baseBio: config.agentBio,
      agencyName: config.name,
      clientName: body.clientName || undefined,
      propertyAddress: body.propertyAddress,
      propertyType: body.propertyType || undefined,
      methodOfSale: body.methodOfSale || undefined,
      priceGuideMin: body.priceGuideMin || undefined,
      priceGuideMax: body.priceGuideMax || undefined,
      proposalType: body.proposalType === 'rental' ? 'rental' : 'sale',
    }

    const copy = await generateAgentCopy(context)
    return NextResponse.json(copy)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate copy'
    console.error('generate-agent-copy failed:', message)
    // Surface the missing-key case plainly; it is a config problem, not a bug.
    const status = message.includes('ANTHROPIC_API_KEY') ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
