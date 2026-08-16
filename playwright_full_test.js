const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const network = [];
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('request', req => { network.push({ type: 'request', url: req.url(), method: req.method() }); });
  page.on('response', res => { network.push({ type: 'response', url: res.url(), status: res.status() }); });
  page.on('dialog', async dialog => { console.log('DIALOG:', dialog.type(), dialog.message()); await dialog.dismiss(); });

  // Prepare temp resume
  const tmp = 'tmp_resume_ui.txt';
  fs.writeFileSync(tmp, 'Alice Test\nSkills: Python, SQL, Pandas\nProject: Sales Dashboard');

  console.log('Opening candidate frontend');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Upload resume
  const fileInput = await page.$('input[type=file]');
  if (!fileInput) {
    console.log('FILE_INPUT_NOT_FOUND'); await browser.close(); process.exit(2);
  }
  await fileInput.setInputFiles(tmp);
  console.log('Uploaded resume via input[type=file]');

  // Fill name
  const nameInput = await page.$('#fullName'); if (nameInput) { await nameInput.fill('Alice Tester'); }

  // Select role
  const select = await page.$('select');
  if (select) { try { await select.selectOption({ label: 'Data Science Engineer' }); console.log('Selected role Data Science Engineer'); } catch(e){ console.log('Role selection failed', e.message); } }

  // Click Analyze & Apply button (form submit)
  const submitBtn = await page.$('button:has-text("Analyze & Apply")') || await page.$('button:has-text("Analyze & Apply")');
  if (!submitBtn) { console.log('ANALYZE_BUTTON_NOT_FOUND'); await browser.close(); process.exit(3); }
  await submitBtn.click();
  console.log('Clicked Analyze & Apply');

  // Wait and capture network
  await page.waitForTimeout(5000);
  const analyzeReqs = network.filter(n => n.type === 'request' && n.url.includes('/analyze'));
  const applyReqs = network.filter(n => n.type === 'request' && n.url.includes('/apply'));
  console.log('ANALYZE_REQS:', JSON.stringify(analyzeReqs, null, 2));
  console.log('APPLY_REQS:', JSON.stringify(applyReqs, null, 2));

  // Check for visible application ID
  const appId = await page.evaluate(() => {
    const el = document.querySelector('.score-value') || document.querySelector('p:contains("Application ID")');
    if (!el) return null; return el.textContent || el.innerText;
  }).catch(()=>null);
  console.log('APP_ID_VISIBLE:', appId);

  await browser.close();
  console.log('NETWORK_LOG:', JSON.stringify(network, null, 2));
})();
