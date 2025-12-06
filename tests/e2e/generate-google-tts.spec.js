import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';

// Config: read LANG and LEVEL from environment, defaults to japanese/basic
const LANG = (process.env.LANG || 'japanese').toLowerCase();
const LEVEL = (process.env.LEVEL || 'basic').toLowerCase();
const RUN_TTS = (process.env.TTS_RUN || '0') === '1';

// Map workspace language name -> translate short code and asset folder name
const LANG_MAP = {
  chinese: { code: 'zh-CN', folder: 'chinese' },
  japanese: { code: 'ja', folder: 'Japanese' },
  korean: { code: 'ko', folder: 'Korean' }
};

function parseCsvRows(csvString) {
  // Minimal RFC4180-friendly CSV parser for small files: returns array of rows -> cells
  const rows = [];
  let cur = [];
  let curField = '';
  let inQuotes = false;
  for (let i = 0; i < csvString.length; i++) {
    const c = csvString[i];
    const nxt = csvString[i + 1];
    if (c === '"') {
      if (inQuotes && nxt === '"') { curField += '"'; i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === ',') { cur.push(curField); curField = ''; continue; }
    if (!inQuotes && (c === '\n' || c === '\r')) {
      if (curField !== '' || cur.length > 0) { cur.push(curField); rows.push(cur); cur = []; curField = ''; }
      // handle CRLF
      if (c === '\r' && nxt === '\n') { i++; }
      continue;
    }
    curField += c;
  }
  if (curField !== '' || cur.length > 0) { cur.push(curField); rows.push(cur); }
  return rows;
}

test.describe('Generate Google TTS audio for a language level', () => {
  test.skip(!RUN_TTS, 'TTS_RUN not enabled - set env TTS_RUN=1 to run this generator');

  test('capture translate_tts responses and save mp3 files', async ({ page }) => {
    // Determine file paths
    const langInfo = LANG_MAP[LANG];
    expect(langInfo, `Unknown LANG=${LANG}`).not.toBeUndefined();

    // tests are executed from ./tests so parent folder is the project root (web_v3)
    const csvPath = path.resolve(process.cwd(), '..', 'data', 'languages', LANG, `${LEVEL}.csv`);
    expect(fs.existsSync(csvPath), `CSV file not found: ${csvPath}`).toBeTruthy();

    const csvRaw = fs.readFileSync(csvPath, { encoding: 'utf8' });
    const rows = parseCsvRows(csvRaw);
    if (rows.length < 2) {
      throw new Error(`CSV ${csvPath} looks empty`);
    }
    const headers = rows[0].map(h => h.trim());
    const wordIdx = headers.indexOf('Word');
    if (wordIdx < 0) throw new Error(`Couldn't find 'Word' header in ${csvPath}`);

    // Build words list (skip header)
    const words = rows.slice(1).map(r => (r[wordIdx] || '').trim()).filter(Boolean);
    console.log(`Preparing to generate audio for ${LANG}/${LEVEL}: ${words.length} words`);

    // Ensure output folder exists in project root (web_v3/assets/audio/...)
    const targetFolder = path.resolve(process.cwd(), '..', 'assets', 'audio', langInfo.folder, LEVEL);
    fs.mkdirSync(targetFolder, { recursive: true });

    // Setup response capture
    const audioResponses = [];
    page.on('response', async (res) => {
      try {
        const url = res.url();
        if (url.includes('translate_tts') || (res.headers()['content-type'] && res.headers()['content-type'].startsWith('audio/'))) {
          // capture only successful audio responses
          if (res.status() === 200) {
            const buffer = await res.body();
            audioResponses.push({ url, buffer });
            console.log('Captured audio response', url);
          }
        }
      } catch (err) {
        console.error('Error capturing response', err);
      }
    });

    // Visit Google Translate with target language preselected
    const targetCode = langInfo.code;
    await page.goto(`https://translate.google.com/?sl=auto&tl=${targetCode}`, { waitUntil: 'domcontentloaded' });

    // ensure the source textarea exists
    const sourceTextarea = page.locator('textarea[aria-label="Source text"], textarea#source');
    await expect(sourceTextarea).toBeVisible({ timeout: 10000 });

    // For each word, type, click listen and save the network response
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      audioResponses.length = 0; // reset

      // Clear and type the word
      await sourceTextarea.fill('');
      // small delay to ensure previous audio is not re-triggered
      await page.waitForTimeout(150);
      await sourceTextarea.type(word, { delay: 40 });
      await page.waitForTimeout(120);

      // Try direct Translate TTS request first
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetCode}&client=gtx&q=${encodeURIComponent(word)}`;
      let audioBuf = null;
      try {
        const ttsResp = await page.request.get(ttsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36',
            'Accept': 'audio/mpeg'
          }
        });
        if (ttsResp && ttsResp.status() === 200) {
          audioBuf = await ttsResp.body();
        }
      } catch (err) {
        console.warn('Direct TTS request failed for', word, err);
      }

      // If direct fetch didn't produce audio, fallback to UI trigger + network capture
      if (!audioBuf) {
        // Click the source "listen" button - try a list of friendly selectors
        const selectors = [
          'button[aria-label^="Listen"], button[aria-label*="Listen to"], button[jsname="M8B0Bb"]',
          'button[aria-label^="발음하기"], button[aria-label*="들어보기"], button[aria-label*="Listen"]'
        ];
        let clicked = false;
        for (const sel of selectors) {
          const btn = page.locator(sel).first();
          if (await btn.count() > 0) {
            try {
              await btn.click({ timeout: 3000 });
              clicked = true;
              break;
            } catch (err) {
              // ignore and try next
            }
          }
        }

        if (!clicked) {
          try { await page.evaluate(() => { const el = document.querySelector('audio'); if (el) el.play(); }); } catch (e) {}
        }

        // small wait for network capturing to collect the translate_tts response
        const maxWait = 5000; // ms
        const polling = 200;
        let waited = 0;
        while (audioResponses.length === 0 && waited < maxWait) {
          await page.waitForTimeout(polling);
          waited += polling;
        }

        if (audioResponses.length > 0) audioBuf = audioResponses[0].buffer;
      }

      if (!audioBuf) {
        console.warn(`No audio available for: ${word} (index ${i})`);
        continue;
      }
      // Keep native characters but remove path-unsafe characters and trim length
      // Standard: use raw word name only (no numbered prefix) to match runtime audio lookup
      const safeName = (word || `word_${i}`).replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
      const ext = '.mp3';
      const audioFile = path.join(targetFolder, `${safeName}${ext}`);
      fs.writeFileSync(audioFile, audioBuf);
      console.log(`[${i + 1}/${words.length}] Saved: ${safeName}${ext}`);

      // small delay between words to avoid rate throttling
      await page.waitForTimeout(300);
    }

    console.log('TTS generation finished. Files saved to', path.resolve(process.cwd(), 'assets', 'audio', langInfo.folder, LEVEL));
  });
});
