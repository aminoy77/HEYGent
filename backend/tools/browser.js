import { chromium } from 'playwright';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DATA_DIR = path.join(os.homedir(), '.vibe-coder', 'browser-data');
let browserContext = null;
let activePage = null;

export async function initBrowser() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });

    // Try system Chrome first (avoids Google detection of headless browsers)
    const launchOptions = {
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,800',
        '--window-position=50,50'
      ],
      viewport: { width: 1280, height: 800 }
    };

    try {
      browserContext = await chromium.launchPersistentContext(DATA_DIR, {
        ...launchOptions,
        channel: 'chrome'
      });
    } catch {
      // Fallback to bundled Chromium
      browserContext = await chromium.launchPersistentContext(DATA_DIR, launchOptions);
    }

    const pages = browserContext.pages();
    activePage = pages.length > 0 ? pages[0] : await browserContext.newPage();

    // Stealth: override navigator.webdriver
    await activePage.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    console.log('🌐 Browser initialized');
    return true;
  } catch (err) {
    console.error('Browser init failed:', err.message);
    return false;
  }
}

export async function browserSearch({ query, url }) {
  if (!browserContext || !activePage) {
    const ok = await initBrowser();
    if (!ok) return { error: 'Browser failed to initialize. Run: npx playwright install chromium' };
  }

  try {
    const target = url || `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    await activePage.goto(target, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await activePage.waitForTimeout(1500);

    const result = await activePage.evaluate(() => {
      // Remove clutter
      document.querySelectorAll('script,style,nav,header,footer,aside,[aria-hidden],.ad,.ads').forEach(el => el.remove());
      const main = document.querySelector('main, #main, #search, .results, article, body');
      const text = (main || document.body).innerText.trim();
      return {
        title: document.title,
        url: window.location.href,
        content: text.substring(0, 10000)
      };
    });

    // Screenshot (JPEG, compressed)
    const screenshot = await activePage.screenshot({ type: 'jpeg', quality: 55, fullPage: false });

    return {
      ...result,
      screenshot: screenshot.toString('base64')
    };
  } catch (err) {
    return { error: err.message, url: activePage?.url?.() || 'unknown' };
  }
}

export async function closeBrowser() {
  if (browserContext) {
    await browserContext.close();
    browserContext = null;
    activePage = null;
  }
}
