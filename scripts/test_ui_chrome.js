// test_ui_chrome.js
// Automated headless Chrome test verifying TalePickle UI, pagination, routing, and console health.

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8089;
const CDP_PORT = 9223;
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-talepickle-'));

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('1. Starting UI static server on port ' + PORT + '...');
  const server = spawn('node', [path.join(__dirname, 'serveUi.js'), String(PORT)], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });

  await wait(1000);

  console.log('2. Starting Headless Chrome with CDP on port ' + CDP_PORT + '...');
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--user-data-dir=' + TMP_DIR,
      '--remote-debugging-port=' + CDP_PORT,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let passed = false;
  try {
    await wait(2000);

    // Get CDP WebSocket debugger URL
    const versionRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const pages = await versionRes.json();
    const wsUrl = pages[0].webSocketDebuggerUrl;
    console.log('3. Connecting to Chrome CDP WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    const callbacks = new Map();
    const consoleLogs = [];
    const jsErrors = [];

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && callbacks.has(data.id)) {
        callbacks.get(data.id)(data.result);
        callbacks.delete(data.id);
      }
      if (data.method === 'Runtime.consoleAPICalled') {
        const text = data.params.args.map((a) => a.value || a.description || '').join(' ');
        consoleLogs.push({ type: data.params.type, text });
      }
      if (data.method === 'Runtime.exceptionThrown') {
        jsErrors.push(data.params.exceptionDetails);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Runtime.enable');
    await send('Page.enable');

    console.log('4. Navigating to http://localhost:' + PORT + '/ ...');
    await send('Page.navigate', { url: `http://localhost:${PORT}/` });
    await wait(3000);

    // Evaluate Library View state
    const evalResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const cards = document.querySelectorAll('.story-card');
        const paginationBtns = document.querySelectorAll('.pagination-btn');
        const footerTitle = document.querySelector('.footer-title');
        const footerSubtitle = document.querySelector('.footer-subtitle');
        const searchInput = document.getElementById('searchInput');
        const themeChips = document.querySelectorAll('.chip[data-theme]');
        const appTitle = document.querySelector('.logo-group h1');

        return {
          cardCount: cards.length,
          paginationBtnCount: paginationBtns.length,
          footerTitle: footerTitle ? footerTitle.innerText : null,
          footerSubtitle: footerSubtitle ? footerSubtitle.innerText : null,
          hasSearchInput: !!searchInput,
          themeChipCount: themeChips.length,
          firstThemeChipText: themeChips.length > 0 ? themeChips[0].innerText : null,
          appTitle: appTitle ? appTitle.innerText : null,
          firstStoryCardText: cards.length > 0 ? cards[0].querySelector('h3')?.innerText : null,
          cardThemeBadges: document.querySelectorAll('.story-card .theme-badge').length,
        };
      })()`,
      returnByValue: true,
    });

    console.log('5. Library Evaluation:', JSON.stringify(evalResult.result.value, null, 2));

    // Test Pagination: click Page 2
    console.log('6. Testing Pagination: clicking Page 2 button...');
    const page2Result = await send('Runtime.evaluate', {
      expression: `(() => {
        const p2Btn = document.querySelector('.pagination-btn[data-page="2"]');
        if (p2Btn) {
          p2Btn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true,
    });
    console.log('Clicked Page 2:', page2Result.result.value);
    await wait(1000);

    const evalPage2 = await send('Runtime.evaluate', {
      expression: `(() => {
        const cards = document.querySelectorAll('.story-card');
        return {
          currentUrl: window.location.href,
          cardCount: cards.length,
          firstStoryCardText: cards.length > 0 ? cards[0].querySelector('h3')?.innerText : null,
        };
      })()`,
      returnByValue: true,
    });
    console.log('Page 2 State:', JSON.stringify(evalPage2.result.value, null, 2));

    // Test Reader Mode: navigate to newly added story pip_the_prickly_hero
    console.log('7. Testing Reader Mode for newly added story: pip_the_prickly_hero...');
    await send('Page.navigate', { url: `http://localhost:${PORT}/story/pip_the_prickly_hero` });
    await wait(2500);

    const evalStory = await send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('.reader-title-area h2')?.innerText;
        const playBtn = document.getElementById('heroPlayStoryBtn')?.innerText;
        const pills = Array.from(document.querySelectorAll('.story-character-pills span')).map(s => s.innerText);
        const stage = document.querySelector('.reader-stage');
        const moralCard = document.querySelector('.reader-story-moral-card');
        const moralText = document.querySelector('.reader-moral-text')?.innerText;
        const footerTitle = document.querySelector('.footer-title')?.innerText;

        return {
          title,
          playBtn,
          pills,
          hasStageSvg: !!stage && !!stage.querySelector('svg'),
          hasMoralCard: !!moralCard,
          moralText,
          footerTitle,
        };
      })()`,
      returnByValue: true,
    });
    console.log('Story Reader Evaluation:', JSON.stringify(evalStory.result.value, null, 2));

    console.log('8. Checking for JS Exceptions or Console Errors...');
    console.log('Console Logs count:', consoleLogs.length);
    consoleLogs.forEach(c => {
      if (c.type === 'error' || c.text.includes('Error') || c.text.includes('warn')) {
        console.log(`[${c.type.toUpperCase()}] ${c.text}`);
      }
    });

    console.log('JS Exceptions count:', jsErrors.length);
    if (jsErrors.length > 0) {
      console.error('JS Exceptions:', JSON.stringify(jsErrors, null, 2));
    }

    if (
      evalResult.result.value.cardCount === 24 &&
      evalResult.result.value.footerTitle === 'TalePickle' &&
      evalPage2.result.value.cardCount === 24 &&
      evalStory.result.value.title === 'Pip the Prickly Hero' &&
      evalStory.result.value.hasStageSvg &&
      evalStory.result.value.hasMoralCard &&
      jsErrors.length === 0
    ) {
      console.log('🎉 ALL AUTOMATED HEADLESS CHROME CHECKS PASSED!');
      passed = true;
    } else {
      console.error('❌ Validation check failed!');
    }

    ws.close();
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    console.log('Cleaning up processes...');
    try { chrome.kill(); } catch (e) {}
    try { server.kill(); } catch (e) {}
    try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (e) {}
    process.exit(passed ? 0 : 1);
  }
}

run();
