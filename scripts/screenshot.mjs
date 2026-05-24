import { chromium } from 'playwright'

const shots = [
  { url: 'http://localhost:3000/', file: '/tmp/agrolink-landing.png', vw: 1440, vh: 900, full: true, label: 'Landing' },
  { url: 'http://localhost:3000/dashboard', file: '/tmp/agrolink-dashboard.png', vw: 1440, vh: 900, full: true, label: 'Dashboard' },
  { url: 'http://localhost:3000/mobile-preview', file: '/tmp/agrolink-mobile.png', vw: 1200, vh: 820, full: true, label: 'Mobile' },
]

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] })

for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.vw, height: s.vh }, deviceScaleFactor: 2 })
  await page.goto(s.url, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: s.file, fullPage: s.full })
  console.log(`✓ ${s.label} → ${s.file}`)
  await page.close()
}

await browser.close()
console.log('Done')
