const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('request', req => { if (req.url().includes('/candidates')) console.log('REQ:', req.method(), req.url()); });
  page.on('response', res => { if (res.url().includes('/candidates')) console.log('RES:', res.status(), res.url()); });

  await page.goto('http://localhost:3000/recruiter', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await browser.close();
})();
