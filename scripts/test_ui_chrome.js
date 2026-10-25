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
        const themeCollapseBtn = document.getElementById('themeCollapseBtn');
        const lengthCollapseBtn = document.getElementById('lengthCollapseBtn');
        const themeChips = document.querySelectorAll('.chip[data-theme]');
        const appTitle = document.querySelector('.logo-group h1');

        return {
          cardCount: cards.length,
          paginationBtnCount: paginationBtns.length,
          footerTitle: footerTitle ? footerTitle.innerText : null,
          footerSubtitle: footerSubtitle ? footerSubtitle.innerText : null,
          hasSearchInput: !!searchInput,
          themeCollapseBtnText: themeCollapseBtn ? themeCollapseBtn.innerText.replace(/\\s+/g, ' ').trim() : null,
          lengthCollapseBtnText: lengthCollapseBtn ? lengthCollapseBtn.innerText.replace(/\\s+/g, ' ').trim() : null,
          themeChipCount: themeChips.length,
          appTitle: appTitle ? appTitle.innerText : null,
          firstStoryCardText: cards.length > 0 ? cards[0].querySelector('h3')?.innerText : null,
          cardThemeBadges: document.querySelectorAll('.story-card .theme-badge').length,
        };
      })()`,
      returnByValue: true,
    });

    console.log('5. Library Evaluation:', JSON.stringify(evalResult.result.value, null, 2));

    // Test Collapsible Filters (Theme & Length) and Animal Pills UI
    console.log('5b. Testing Collapsible Theme & Length Filters and Animal Pills UI...');
    const collapsibleTest = await send('Runtime.evaluate', {
      expression: `(() => {
        const themeBtn = document.getElementById('themeCollapseBtn');
        const themeMenu = document.getElementById('themeDropdownMenu');
        const lengthBtn = document.getElementById('lengthCollapseBtn');
        const lengthMenu = document.getElementById('lengthDropdownMenu');

        if (!themeBtn || !themeMenu || !lengthBtn || !lengthMenu) {
          return { error: 'Collapsible filter elements missing' };
        }

        // 1. Initially closed
        const initialThemeMenuOpen = themeMenu.classList.contains('open');

        // 2. Click Theme button -> opens menu
        themeBtn.click();
        const menuOpenedOnClick = themeMenu.classList.contains('open');

        // 3. Click Animals option in Theme menu (triggers renderList)
        const animalsThemeBtn = themeMenu.querySelector('.chip[data-theme="Animals"]');
        if (!animalsThemeBtn) return { error: 'Animals menu item not found' };
        animalsThemeBtn.click();

        // Re-query newly rendered elements
        const themeBtnAfterThemeSelect = document.getElementById('themeCollapseBtn');
        const themeMenuAfterThemeSelect = document.getElementById('themeDropdownMenu');
        const themeMenuClosedAfterSelect = !themeMenuAfterThemeSelect.classList.contains('open');
        const themeBtnTextAfterSelect = themeBtnAfterThemeSelect.innerText.replace(/\\s+/g, ' ').trim();
        const themeBtnIsActive = themeBtnAfterThemeSelect.classList.contains('active');

        // Animal pills row should appear
        const animalRow = document.querySelector('.animal-pills-row');
        const rowHeight = animalRow ? animalRow.offsetHeight : 0;
        const animalChips = animalRow ? Array.from(animalRow.querySelectorAll('.chip[data-animal]')).map(c => c.innerText.trim()) : [];
        const moreSelect = document.getElementById('moreAnimalsSelect');
        const selectOptionsCount = moreSelect ? moreSelect.options.length : 0;

        // Check for non-animals leakage
        const forbiddenNonAnimals = ['Farmer', 'Countryman', 'Goatherd', 'Spendthrift', 'Wheel', 'Ass'];
        const leaked = forbiddenNonAnimals.filter(fa => animalChips.some(ac => ac.includes(fa)));

        // 4. Test Fox chip
        const foxBtn = animalRow ? animalRow.querySelector('.chip[data-animal="fox"]') : null;
        if (foxBtn) foxBtn.click();
        const foxCardsCount = document.querySelectorAll('.story-card').length;
        const foxHeader = document.querySelector('.results-count')?.innerText || '';

        // Toggle Fox off
        const foxBtnActive = document.querySelector('.animal-pills-row .chip.active[data-animal="fox"]');
        if (foxBtnActive) foxBtnActive.click();
        const toggledCardsCount = document.querySelectorAll('.story-card').length;

        // 5. Test Hedgehog from dropdown
        const freshMoreSelect = document.getElementById('moreAnimalsSelect');
        if (freshMoreSelect) {
          freshMoreSelect.value = 'hedgehog';
          freshMoreSelect.dispatchEvent(new Event('change'));
        }
        const hedgehogPill = document.querySelector('.animal-pills-row .chip.active[data-animal="hedgehog"]');
        const hedgehogCardsCount = document.querySelectorAll('.story-card').length;

        // 6. Test Length collapsible filter
        const currentLengthBtn = document.getElementById('lengthCollapseBtn');
        const currentLengthMenu = document.getElementById('lengthDropdownMenu');
        currentLengthBtn.click();
        const lengthMenuOpened = currentLengthMenu.classList.contains('open');

        const shortOption = currentLengthMenu.querySelector('.chip[data-length="short"]');
        if (shortOption) shortOption.click();

        // Re-query after renderList()
        const lengthBtnAfterSelect = document.getElementById('lengthCollapseBtn');
        const lengthMenuAfterSelect = document.getElementById('lengthDropdownMenu');
        const lengthMenuClosed = !lengthMenuAfterSelect.classList.contains('open');
        const lengthBtnText = lengthBtnAfterSelect.innerText.replace(/\\s+/g, ' ').trim();
        const lengthBtnActive = lengthBtnAfterSelect.classList.contains('active');

        // 7. Clear all filters button
        const clearBtn = document.getElementById('clearAllFiltersBtn');
        const hasClearBtn = !!clearBtn;
        if (clearBtn) clearBtn.click();

        const themeBtnAfterReset = document.getElementById('themeCollapseBtn').innerText.replace(/\\s+/g, ' ').trim();
        const lengthBtnAfterReset = document.getElementById('lengthCollapseBtn').innerText.replace(/\\s+/g, ' ').trim();
        const animalRowAfterReset = document.querySelector('.animal-pills-row');

        return {
          initialThemeMenuOpen,
          menuOpenedOnClick,
          themeMenuClosedAfterSelect,
          themeBtnTextAfterSelect,
          themeBtnIsActive,
          rowHeight,
          animalChips,
          selectOptionsCount,
          leaked,
          foxCardsCount,
          foxHeaderMatches: foxHeader.includes('Fox'),
          toggledCardsCount,
          hasHedgehogPill: !!hedgehogPill,
          hedgehogCardsCount,
          lengthMenuOpened,
          lengthMenuClosed,
          lengthBtnText,
          lengthBtnActive,
          hasClearBtn,
          themeBtnAfterReset,
          lengthBtnAfterReset,
          animalRowRemovedAfterReset: !animalRowAfterReset,
        };
      })()`,
      returnByValue: true,
    });
    console.log('5b. Collapsible Filter Test Result:', JSON.stringify(collapsibleTest.result.value, null, 2));

    // Capture screenshot of the compact filter bar
    console.log('5c. Capturing screenshot of compact collapsible filters...');
    const shotData = await send('Page.captureScreenshot', { format: 'png' });
    const previewPath = '/Users/rajantiwari/.gemini/antigravity/brain/f0bc0615-7b87-49a7-9033-77ce5c504dea/collapsible_filters_preview.png';
    fs.writeFileSync(previewPath, Buffer.from(shotData.data, 'base64'));
    console.log('Saved screenshot to:', previewPath);

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

    // Test Reader Mode: navigate to newly added story the_brave_little_hedgehog
    console.log('7. Testing Reader Mode for newly added story: the_brave_little_hedgehog...');
    await send('Page.navigate', { url: `http://localhost:${PORT}/story/the_brave_little_hedgehog` });
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
      evalResult.result.value.themeCollapseBtnText.includes('Theme:') &&
      evalResult.result.value.lengthCollapseBtnText.includes('Length:') &&
      evalPage2.result.value.cardCount === 24 &&
      evalStory.result.value.title === 'The Brave Little Hedgehog' &&
      evalStory.result.value.hasStageSvg &&
      evalStory.result.value.hasMoralCard &&
      collapsibleTest.result.value.menuOpenedOnClick &&
      collapsibleTest.result.value.themeMenuClosedAfterSelect &&
      collapsibleTest.result.value.themeBtnIsActive &&
      collapsibleTest.result.value.rowHeight <= 45 &&
      collapsibleTest.result.value.leaked.length === 0 &&
      collapsibleTest.result.value.hasHedgehogPill &&
      collapsibleTest.result.value.lengthMenuOpened &&
      collapsibleTest.result.value.lengthMenuClosed &&
      collapsibleTest.result.value.lengthBtnActive &&
      collapsibleTest.result.value.hasClearBtn &&
      collapsibleTest.result.value.animalRowRemovedAfterReset &&
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
