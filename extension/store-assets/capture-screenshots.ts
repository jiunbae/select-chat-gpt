const { chromium } = require('playwright');
const path = require('path');

const OUTPUT_DIR = __dirname;

async function captureScreenshots() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    // 1. 메인 페이지에서 공유 링크 찾기
    console.log('Finding share pages...');
    await page.goto('https://selectchatgpt.jiun.dev', { waitUntil: 'networkidle' });

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => a.href);
    });

    const shareLinks = links.filter(l => l.includes('/s/'));
    console.log('Share links found:', shareLinks.length);

    // 2. 공유 페이지 스크린샷
    if (shareLinks.length > 0) {
      console.log('Capturing share page:', shareLinks[0]);
      await page.goto(shareLinks[0], { waitUntil: 'networkidle' });
      await page.waitForSelector('.markdown-content', { state: 'visible' });
      await page.screenshot({
        path: path.join(OUTPUT_DIR, 'screenshot-2-conversation.png'),
        fullPage: false
      });
      console.log('✓ Share conversation page captured');
    }
    console.log('\nScreenshots saved to:', OUTPUT_DIR);
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
