const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  const network = [];
  page.on('requestfinished', req => {
    try { network.push({ url: req.url(), method: req.method(), status: req.response() ? req.response().status() : null }); } catch (e) {}
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  // Try to find upload input and role selector - this depends on app DOM; we'll attempt common selectors
  const fileInput = await page.$('input[type=file]');
  if (!fileInput) { console.log('No file input found'); await browser.close(); process.exit(2); }
  // create a small temp resume file
  const fs = require('fs'); const path = require('path'); const tmp = path.join(process.cwd(),'tmp_resume.txt'); fs.writeFileSync(tmp, 'John Doe\nPython, SQL, Machine Learning\nProject: Sales Dashboard');
  await fileInput.setInputFiles(tmp);
  // select a role if dropdown exists
  const roleSelect = await page.$('select');
  if (roleSelect) { await roleSelect.selectOption({ label: 'Data Science Engineer' }).catch(()=>{}); }
  // click Analyze button
  const analyzeButton = await page.$('button:has-text("Analyze")') || await page.$('button:has-text("analyze")') || await page.$('button:has-text("Apply")');
  if (!analyzeButton) { console.log('Analyze button not found'); await browser.close(); process.exit(3); }
  await analyzeButton.click();
  // wait for /analyze request to complete
  await page.waitForTimeout(3000);
  // capture network entries
  console.log('Captured network requests:');
  console.log(JSON.stringify(network, null, 2));
  // try to click Apply if visible
  const applyButton = await page.$('button:has-text("Apply")');
  if (applyButton) { await applyButton.click(); await page.waitForTimeout(1000); }
  await browser.close();
})();
