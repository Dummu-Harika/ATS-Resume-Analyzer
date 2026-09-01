const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:3000/recruiter', { waitUntil: 'networkidle' });
  const res = await page.evaluate(async ()=>{
    const r = await fetch('http://localhost:8000/candidates');
    const status = r.status;
    const json = await r.json().catch(e=>({error: e.message}));
    return {status, length: Array.isArray(json)?json.length:0, json};
  });
  console.log(JSON.stringify(res, null, 2));
  await browser.close();
})();
