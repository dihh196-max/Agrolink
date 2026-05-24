import { chromium } from 'playwright'
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1200, height: 1700 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:3000/mobile-preview', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(1500)

// Screenshot just the "Novidades" heading + the second row of phones
const heading = page.locator('h2:has-text("Novidades")')
await heading.scrollIntoViewIfNeeded()
const box = await heading.boundingBox()
await page.screenshot({
  path: '/tmp/agrolink-mobile-novas.png',
  clip: { x: 0, y: box.y - 20, width: 1200, height: 780 },
})
console.log('done')
await browser.close()
