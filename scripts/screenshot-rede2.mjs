import { chromium } from 'playwright'

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })

await page.goto('http://localhost:3000/rede', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2500)

// Search people/companies
await page.fill('input[placeholder*="Buscar"]', 'souza')
await page.waitForTimeout(2000)

// Open the chat conversation in the sidebar (click first thread)
const thread = page.locator('button:has-text("Maria Souza")').last()
if (await thread.count()) {
  await thread.click()
  await page.waitForTimeout(1500)
}

await page.screenshot({ path: '/tmp/agrolink-rede-chat.png', fullPage: true })
console.log('✓ /tmp/agrolink-rede-chat.png')
await browser.close()
