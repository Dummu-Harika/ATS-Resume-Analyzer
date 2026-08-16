const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));

  await page.goto('http://localhost:3000/recruiter', { waitUntil: 'networkidle' });
  console.log('Opened recruiter page');
  // Wait for candidate list to load
  await page.waitForTimeout(2000);
  // Try to find candidate named Alice Tester
  const candidateRow = await page.$(`text=Alice Tester`);
  if (!candidateRow) { console.log('Candidate not found in recruiter list'); await browser.close(); process.exit(2); }
  // Click candidate to open details
  await candidateRow.click();
  await page.waitForTimeout(1000);
  // Click Shortlist button
  const shortlistBtn = await page.$('button:has-text("Shortlist Candidate")');
  if (!shortlistBtn) { console.log('Shortlist button not found'); await browser.close(); process.exit(3); }
  await shortlistBtn.click();
  console.log('Clicked Shortlist Candidate');
  await page.waitForTimeout(1000);
  // Verify status badge changed
  const statusText = await page.evaluate(() => {
    const el = document.querySelector('.status-badge');
    return el ? el.innerText : null;
  });
  console.log('Status text on page:', statusText);
  await browser.close();
})();
