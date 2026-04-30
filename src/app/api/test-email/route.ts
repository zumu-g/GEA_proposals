import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev'
  const to = request.nextUrl.searchParams.get('to') || 'support@grantsea.com.au'

  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
  }

  const resend = new Resend(apiKey)

  const { data, error } = await resend.emails.send({
    from: `GEA Proposals <${fromEmail}>`,
    to: [to],
    subject: 'GEA Proposals — test email',
    html: `<p>This is a test email from GEA Proposals.</p><p>Sent from: <strong>${fromEmail}</strong></p><p>If you received this, email sending is working correctly.</p>`,
  })

  if (error) {
    return NextResponse.json({ success: false, from: fromEmail, error }, { status: 400 })
  }

  return NextResponse.json({ success: true, from: fromEmail, to, id: data?.id })
}
