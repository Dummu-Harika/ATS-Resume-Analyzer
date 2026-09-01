const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:3000/recruiter', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const count = await page.evaluate(()=>{
    // try common selectors
    const el = document.querySelectorAll('.candidate-card, .candidate, .candidate-row, tbody tr, .list-item');
    return el.length;
  });
  console.log('DOM candidates count:', count);
  await browser.close();
})();
