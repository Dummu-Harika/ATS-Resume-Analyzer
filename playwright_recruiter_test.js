const { chromium } = require('playwright');

(async () => {
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));

    await page.goto('http://localhost:3000/recruiter', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Opened recruiter page');

    await page.waitForTimeout(2000);

    const candidateRow = await page.$(`text=Alice Tester`);
    if (!candidateRow) {
      console.log('Candidate not found in recruiter list');
      process.exitCode = 2;
      return;
    }

    console.log('PASS: Alice Tester found in recruiter list');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
