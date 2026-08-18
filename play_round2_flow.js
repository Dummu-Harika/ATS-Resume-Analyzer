const { chromium } = require('playwright');

(async () => {
  const API = 'http://127.0.0.1:8000';
  // create candidate
  const applyResp = await fetch(`${API}/apply`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ name: 'UI Tester', email: 'ui@test', role: 'Data Science Engineer', analysis: { parameter_scores: { skills:50, experience:50, education:50, projects:50, ats:50 }, final_score:50, overallScore:50 } })
  });
  const app = await applyResp.json();
  const candidateId = app.id;
  console.log('CandidateId', candidateId);
  // start round2
  const sr = await fetch(`${API}/start_round2`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: candidateId }) });
  const srj = await sr.json();
  console.log('StartRound2 response:', JSON.stringify(srj).substring(0,2000));
  const sessionId = srj.session_id;
  const initialQuestion = srj.question || null;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  let dialogSeen = false;
  page.on('dialog', async dialog => { console.log('DIALOG:', dialog.message()); dialogSeen = true; await dialog.dismiss(); });

  // Pre-populate sessionStorage with initial question if available
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  // wait a moment for app to initialize
  await page.waitForTimeout(500);

  if (initialQuestion) {
    const qstr = JSON.stringify(initialQuestion);
    await page.evaluate(({ sid, qjson }) => {
      try {
        const qobj = JSON.parse(qjson);
        sessionStorage.setItem(`round2_initial_${sid}`, JSON.stringify(qobj));
      } catch (e) {
        sessionStorage.setItem(`round2_initial_${sid}`, 'undefined');
      }
    }, { sid: sessionId, qjson: qstr });
  }
  // also set answers storage to empty
  await page.evaluate(({ sid }) => {
    sessionStorage.setItem(`round2_answers_${sid}`, JSON.stringify({}));
  }, { sid: sessionId });

  await page.goto(`http://localhost:3000/round2?session_id=${encodeURIComponent(sessionId)}`, { waitUntil: 'networkidle' });

  // dump some page content for debugging
  const content = await page.content();
  console.log('PAGE HTML START:\n', content.substring(0,3000));

  const stored = await page.evaluate((sid) => sessionStorage.getItem(`round2_initial_${sid}`), sessionId);
  console.log('sessionStorage key exists:', !!stored);
  if (stored) console.log('sessionStorage sample:', stored.substring(0,300));

  for (let i=0;i<30;i++) {
  // check final
    const isFinal = await page.$('text=Assessment Complete');
    if (isFinal) { console.log('Final report shown'); break; }

  // wait until either radio, textarea or submit button appears
  const ok = await Promise.race([
    page.waitForSelector('input[type=radio]', { timeout: 10000 }).then(()=> 'radio').catch(()=>null),
    page.waitForSelector('textarea', { timeout: 10000 }).then(()=> 'textarea').catch(()=>null),
    page.waitForSelector('text=Submit Answer', { timeout: 10000 }).then(()=> 'submit').catch(()=>null)
  ]);

  if (!ok) { console.log('No interactive element found, aborting'); break; }

  // pick an option if radio exists
  const radio = await page.$('input[type=radio]');
  if (radio) {
    try { await radio.check(); } catch(e){}
  } else {
    // type into textarea
    const ta = await page.$('textarea');
    if (ta) await ta.fill('Test answer');
  }

  // click submit - try locator first
  try {
    const btn = await page.$('text=Submit Answer');
    if (btn) {
      await btn.click();
    } else {
      await page.click('button');
    }
  } catch (e) {
    console.log('Click failed, trying generic button click', e.message);
    await page.click('button').catch(()=>{});
  }

  // short wait for next question
  await page.waitForTimeout(600);
  }

  console.log('Dialog seen?', dialogSeen);

  // ensure final report present
  const final = await page.$('text=Assessment Complete');
  console.log('Final present?', !!final);

  await browser.close();
  process.exit(dialogSeen ? 2 : 0);
})();