import { chromium } from 'playwright'

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })

// Capture console errors
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR:', m.text()) })

await page.goto('http://localhost:3000/rede', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2500) // demo login + notifications/threads load

// Type a search query
await page.fill('input[placeholder*="Buscar"]', 'soja')
await page.waitForTimeout(2500) // search debounce + fetch

await page.screenshot({ path: '/tmp/agrolink-rede.png', fullPage: true })
console.log('✓ Rede → /tmp/agrolink-rede.png')

await browser.close()
