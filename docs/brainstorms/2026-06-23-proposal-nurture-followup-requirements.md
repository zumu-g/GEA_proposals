---
date: 2026-06-23
topic: proposal-nurture-followup
---

# Proposal Tracking & Nurture Follow-Up

## Summary

Turn the existing nurture engine from auto-send into a review-and-approve flow, and add SMS as a second follow-up channel alongside email. The day-after-send touchpoint is reframed from "did you receive it" to a warm "any questions? let's arrange a call", and all touchpoint wording adapts to whether the proposal is a sale or a rental.

---

## Problem Frame

When a proposal goes out, the follow-up that converts a vendor is personal and timely — Stuart manually sends a next-day "hope you've had a chance to review… happy to arrange a call" message (often by SMS) to open the door to a conversation. That manual step is easy to drop when busy, and it has no record against the proposal.

The app already auto-creates a 5-touchpoint nurture plan on send and auto-sends the emails, but two things don't match how Stuart actually works: (1) the emails fire without him seeing them, which conflicts with his relationship-first, personal voice; and (2) there's no SMS channel at all, even though the next-day text is the highest-value touch. The result is either un-reviewed automated email going to vendors, or the personal follow-up not happening consistently.

---

## Key Decisions

**CRM = the app's internal activity log.** "Add a note to the CRM and attach a nurture plan" is satisfied by the existing `activities` table (`logActivity`) and the nurture plan auto-created on send. No external agency CRM (VaultRE, Rex, AgentBox, etc.) is in scope. This part is largely already built; the work is to confirm it records cleanly and surface it.

**Approve-before-send replaces auto-send for the whole sequence.** Every touchpoint (email and SMS) becomes a draft that Stuart reviews and sends/edits/skips. This is a deliberate behaviour change from today's auto-send, chosen to protect the personal voice.

**SMS is a new channel, gated on an optional mobile.** A mobile field is added to the proposal; an SMS draft is only created when a mobile is present. No proposal is blocked by a missing number.

**Wording is sale/rental aware.** Touchpoint copy adapts to the proposal type — rental proposals reference the rental process and tenant selection; sales reference the sale. Generated in Stuart's voice via the existing Claude prompts.

**Un-actioned drafts sit pending indefinitely.** Nothing un-reviewed ever auto-sends. Drafts wait in a review queue until Stuart acts; the trade-off (queue can build up) is accepted and managed via the notifications surface.

---

## Requirements

### Tracking & CRM note

R1. On send, the proposal records a note in the internal activity log and has a nurture plan attached automatically (confirm existing behaviour works and is visible on the dashboard timeline).

R2. The nurture plan and its touchpoint statuses are viewable per proposal, showing what has been sent, what is drafted/pending, and what was skipped.

### Approve-before-send queue

R3. Every nurture touchpoint that produces an outbound message (email and SMS) is created as a **draft** rather than sent automatically.

R4. Drafts surface in a review queue (dashboard / notifications) where Stuart can **send, edit, or skip** each one.

R5. A draft that is not actioned remains pending indefinitely; it never auto-sends and is never auto-expired.

R6. Call touchpoints continue to behave as today — they flag a reminder for Stuart to call, with talking points; they are not "sent".

### Day-1 follow-up

R7. The day-after-send touchpoint is reframed to an "any questions / happy to arrange a call" message in Stuart's voice (the Udeni-style message is the reference tone).

R8. The day-1 follow-up produces both an email draft and, when a mobile is present, an SMS draft.

### SMS channel

R9. A mobile number can be captured on a proposal (added to wizard step 1) and is **optional**.

R10. When a mobile is present, touchpoints that have an SMS form produce an SMS draft; when absent, only the email draft is produced and the proposal still proceeds normally.

R11. SMS drafts are short, plain-text, and in Stuart's voice — suited to a text message, not a reformatted email.

### Sale / rental awareness

R12. Touchpoint copy (email and SMS) adapts to whether the proposal is a sale or a rental, using the appropriate language for each.

---

## Key Flows

F1. **Send → track.** Stuart sends a proposal → status moves to sent, a note is logged, a nurture plan is attached, and (if a mobile exists) SMS-capable touchpoints are prepared. Day-1 drafts become due the next day.

F2. **Review queue.** A touchpoint comes due → its email draft (and SMS draft, if applicable) appears in the review queue → Stuart edits if needed and sends, or skips. Status updates against the proposal and the activity log.

F3. **No mobile.** Proposal has no mobile → only email drafts are produced across the sequence; nothing is blocked.

F4. **Vendor responds / converts.** Proposal is approved or rejected → remaining drafts stop being surfaced (sequence halts), consistent with today's skip-on-approve/reject behaviour.

---

## Acceptance Examples

AE1. **Covers R3, R4.** When a touchpoint comes due, no message is sent automatically; instead a draft appears in the review queue awaiting Stuart's action.

AE2. **Covers R5.** When Stuart leaves a draft un-actioned for days, it remains in the queue unchanged and nothing is sent on his behalf.

AE3. **Covers R8, R10.** When the day-1 follow-up is due and the proposal has a mobile, both an email draft and an SMS draft are created. When it has no mobile, only the email draft is created.

AE4. **Covers R12.** When the proposal is a rental, the day-1 copy references the rental process / tenant selection; when it's a sale, it references the sale — without Stuart rewriting it.

---

## Scope Boundaries

**In scope**
- Approve-before-send queue for all touchpoints (email + SMS)
- SMS channel with optional mobile capture
- Day-1 follow-up reframe + sale/rental-aware copy
- Confirming the internal CRM note + nurture-plan attachment on send

**Outside this product's identity**
- External agency CRM sync (VaultRE, Rex, AgentBox, etc.) — explicitly not built.

**Deferred for later**
- Two-way SMS / inbound reply handling (these are one-way outbound drafts).
- Per-touchpoint analytics beyond existing view/sent tracking.
- Bulk approve-all across multiple proposals.

---

## Dependencies / Assumptions

- **SMS provider is a planning decision.** An Australian-capable SMS provider (e.g. ClickSend, MessageMedia, Twilio) and its cost/credentials are chosen during planning, not here.
- **SMS consent / opt-out is a real obligation.** Australian marketing-message rules (Spam Act) generally require consent and a functional opt-out. Treat consent handling and an opt-out path as a requirement to resolve in planning before SMS goes live; this brainstorm assumes Stuart has a vendor relationship that supports contact, but the opt-out mechanism still needs designing.
- Mobile numbers entered are assumed to be valid AU mobiles; validation/formatting is a planning detail.

---

## Sources / Research

- `src/lib/nurture.ts` — existing AI nurture engine: plan generation, 5-touchpoint schedule (Day 1/3/7/14/21), Claude content generation, `processNurtureQueue`, skip/pause/resume.
- `src/app/api/send/route.ts` — `createNurturePlan(proposalId)` already fires on send; status → sent; `sentAt` stamped.
- `src/app/api/notifications/route.ts` — notification surface already references an `'sms'` touchpoint type (`tp.touchpoint_type === 'sms'`), so the data model anticipates SMS though nothing sends it yet.
- `src/lib/db.ts` — `proposals` table has **no** mobile/phone column today (only `client_email`); `nurture_touchpoints` already carries `type`, `day_number`, `talking_points`, `status`. `activities` table backs the CRM note via `logActivity`.
- Today's nurture emails **auto-send** via the 15-min cron — the approve-before-send requirement is a deliberate change from this.
