import { test, expect } from '@playwright/test'

const SCREENSHOT_DIR = './e2e/screenshots'

test.describe('Visual Design Review', () => {

  test('Homepage - Create Proposal Form', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/homepage-full.png`, fullPage: true })

    // Fill form to show interaction states
    await page.fill('#clientName', 'Jane Williams')
    await page.fill('#clientEmail', 'jane@example.com')
    await page.fill('#propertyAddress', '42 Brighton Marina, Brighton, BN2 5WA')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/homepage-filled.png`, fullPage: true })
  })

  test('Homepage - Submit and Result State', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.fill('#clientName', 'Test Client')
    await page.fill('#clientEmail', 'test@example.com')
    await page.fill('#propertyAddress', '15 The Lanes, Brighton, BN1 1HB')

    await page.click('button[type="submit"]')

    // Wait for result
    await page.waitForSelector('text=proposal created', { timeout: 10000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/homepage-success.png`, fullPage: true })
  })

  test('Dashboard - Empty State', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Wait for loading to finish
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard.png`, fullPage: true })
  })

  test('Proposal Page - Full View', async ({ page }) => {
    // First create a proposal via the form
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.fill('#clientName', 'Sarah Thompson')
    await page.fill('#clientEmail', 'sarah@example.com')
    await page.fill('#propertyAddress', '7 Kemptown Mews, Brighton, BN2 1PA')

    await page.click('button[type="submit"]')
    await page.waitForSelector('text=proposal created', { timeout: 10000 })

    // Get the proposal URL from the success message
    const linkEl = await page.locator('a:has-text("preview proposal")')
    const href = await linkEl.getAttribute('href')

    if (href) {
      await page.goto(href)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500) // Let animations complete
      await page.screenshot({ path: `${SCREENSHOT_DIR}/proposal-hero.png`, fullPage: false })
      await page.screenshot({ path: `${SCREENSHOT_DIR}/proposal-full.png`, fullPage: true })

      // Scroll to specific sections for detail screenshots
      const sections = [
        { selector: 'text=your property', name: 'proposal-introduction' },
        { selector: 'text=the journey', name: 'proposal-sale-process' },
        { selector: 'text=our approach', name: 'proposal-marketing' },
        { selector: 'text=our fee', name: 'proposal-fees' },
        { selector: 'text=what happens next', name: 'proposal-next-steps' },
      ]

      for (const section of sections) {
        const el = page.locator(section.selector).first()
        if (await el.isVisible().catch(() => false)) {
          await el.scrollIntoViewIfNeeded()
          await page.waitForTimeout(500)
          await page.screenshot({ path: `${SCREENSHOT_DIR}/${section.name}.png`, fullPage: false })
        }
      }

      // Screenshot the approval button/modal
      const approveBtn = page.locator('text=approve proposal').first()
      if (await approveBtn.isVisible().catch(() => false)) {
        await approveBtn.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: `${SCREENSHOT_DIR}/proposal-approval-modal.png`, fullPage: false })
      }
    }
  })

  test('404 Page', async ({ page }) => {
    await page.goto('/proposal/nonexistent-id-12345')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/404-page.png`, fullPage: true })
  })
})
