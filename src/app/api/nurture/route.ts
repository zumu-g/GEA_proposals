import { NextRequest, NextResponse } from 'next/server'
import {
  getNurturePlan,
  getAllNurturePlans,
  createNurturePlan,
  generateNurturePlan,
  executeNurtureTouchpoint,
  processNurtureQueue,
  skipTouchpoint,
  pauseNurturePlan,
  resumeNurturePlan,
  completeCallTouchpoint,
  generateNurtureContent,
} from '@/lib/nurture'

/**
 * GET /api/nurture
 * Returns nurture plans and their touchpoints.
 * - ?proposalId=X — returns the plan for a specific proposal
 * - No params — returns all active nurture plans
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const proposalId = searchParams.get('proposalId')

    if (proposalId) {
      const result = getNurturePlan(proposalId)
      if (!result) {
        return NextResponse.json({ error: 'No nurture plan found for this proposal' }, { status: 404 })
      }
      return NextResponse.json(result)
    }

    // Return all active nurture plans
    const plans = getAllNurturePlans()
    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Error fetching nurture plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch nurture plan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/nurture
 * Actions:
 *   generate     + proposalId       — generate an AI nurture plan for a proposal
 *   create       + proposalId       — create a template-based nurture plan (no AI)
 *   execute      + touchpointId     — execute a specific touchpoint (send email or flag call)
 *   process_queue                   — process all due touchpoints
 *   skip         + touchpointId     — skip a touchpoint
 *   pause        + proposalId       — pause a nurture plan
 *   resume       + proposalId       — resume a paused plan
 *   complete-call + touchpointId    — mark a call touchpoint as completed
 *   generate-preview + proposalId   — preview AI-generated email content
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { proposalId, action, touchpointId } = body

    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'action is required and must be a string' }, { status: 400 })
    }

    switch (action) {
      case 'generate': {
        if (!proposalId) {
          return NextResponse.json({ error: 'proposalId is required' }, { status: 400 })
        }
        try {
          const result = await generateNurturePlan(proposalId)
          return NextResponse.json({ success: true, ...result })
        } catch (genError) {
          console.error('Error generating nurture plan:', genError)
          return NextResponse.json(
            {
              error: 'Failed to generate nurture plan',
              details: genError instanceof Error ? genError.message : 'Unknown error',
            },
            { status: 500 }
          )
        }
      }

      case 'create': {
        if (!proposalId) {
          return NextResponse.json({ error: 'proposalId is required' }, { status: 400 })
        }
        const result = createNurturePlan(proposalId)
        return NextResponse.json({ success: true, ...result })
      }

      case 'execute': {
        if (!touchpointId || typeof touchpointId !== 'number') {
          return NextResponse.json({ error: 'touchpointId is required and must be a number' }, { status: 400 })
        }
        const result = await executeNurtureTouchpoint(touchpointId)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true, message: 'Touchpoint executed' })
      }

      case 'process_queue':
      case 'process': {
        const result = await processNurtureQueue()
        return NextResponse.json({ success: true, ...result })
      }

      case 'skip': {
        if (!touchpointId || typeof touchpointId !== 'number') {
          return NextResponse.json({ error: 'touchpointId is required and must be a number' }, { status: 400 })
        }
        const skipped = skipTouchpoint(touchpointId)
        if (!skipped) {
          return NextResponse.json({ error: 'Touchpoint not found or already completed/sent' }, { status: 404 })
        }
        return NextResponse.json({ success: true, message: 'Touchpoint skipped' })
      }

      case 'pause': {
        if (!proposalId) {
          return NextResponse.json({ error: 'proposalId is required' }, { status: 400 })
        }
        const paused = pauseNurturePlan(proposalId)
        if (!paused) {
          return NextResponse.json({ error: 'No active nurture plan found to pause' }, { status: 404 })
        }
        return NextResponse.json({ success: true, message: 'Nurture plan paused' })
      }

      case 'resume': {
        if (!proposalId) {
          return NextResponse.json({ error: 'proposalId is required' }, { status: 400 })
        }
        const resumed = resumeNurturePlan(proposalId)
        if (!resumed) {
          return NextResponse.json({ error: 'No paused nurture plan found to resume' }, { status: 404 })
        }
        return NextResponse.json({ success: true, message: 'Nurture plan resumed' })
      }

      case 'complete-call': {
        if (!touchpointId || typeof touchpointId !== 'number') {
          return NextResponse.json({ error: 'touchpointId is required and must be a number' }, { status: 400 })
        }
        const completed = completeCallTouchpoint(touchpointId)
        if (!completed) {
          return NextResponse.json({ error: 'Call touchpoint not found or not a call type' }, { status: 404 })
        }
        return NextResponse.json({ success: true, message: 'Call touchpoint completed' })
      }

      case 'generate-preview': {
        if (!proposalId) {
          return NextResponse.json({ error: 'proposalId is required' }, { status: 400 })
        }

        const { touchpointType, touchpointSubject } = body
        const type = touchpointType || 'email'
        const subject = touchpointSubject || 'Following up on your proposal'

        try {
          const content = await generateNurtureContent(proposalId, type, subject)
          return NextResponse.json({
            success: true,
            preview: {
              subject,
              bodyHtml: content,
              type,
              proposalId,
            },
          })
        } catch (previewError) {
          console.error('Error generating nurture preview:', previewError)
          return NextResponse.json(
            {
              error: 'Failed to generate preview',
              details: previewError instanceof Error ? previewError.message : 'Unknown error',
            },
            { status: 500 }
          )
        }
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: generate, create, execute, process_queue, skip, pause, resume, complete-call, generate-preview` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in nurture API:', error)
    return NextResponse.json(
      { error: 'Nurture operation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
