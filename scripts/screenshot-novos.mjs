import { chromium } from 'playwright'
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 1 })

// Vagas
await page.goto('http://localhost:3000/vagas', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2500)
await page.screenshot({ path: '/tmp/agrolink-vagas.png', fullPage: false })
console.log('vagas done')

// Marketplace
await page.goto('http://localhost:3000/marketplace', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2500)
await page.screenshot({ path: '/tmp/agrolink-marketplace.png', fullPage: false })
console.log('marketplace done')

await browser.close()
