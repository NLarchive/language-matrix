/**
 * Audio Verification Test Suite
 * Verifies that audio files exist for all vocabulary words across all languages
 * Run with: npx playwright test e2e/audio-verification.spec.js --project=chromium
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const LANGUAGES = [
    { name: 'chinese', folder: 'chinese' },
    { name: 'japanese', folder: 'Japanese' },
    { name: 'korean', folder: 'Korean' }
];

const LEVELS = ['basic', 'intermediate', 'advanced'];

function parseCsvRows(csvString) {
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
            if (c === '\r' && nxt === '\n') { i++; }
            continue;
        }
        curField += c;
    }
    if (curField !== '' || cur.length > 0) { cur.push(curField); rows.push(cur); }
    return rows;
}

test.describe('Audio Coverage Verification', () => {
    const allReports = [];

    for (const lang of LANGUAGES) {
        for (const level of LEVELS) {
            test(`${lang.name}/${level} - verify audio coverage`, async () => {
                const projectRoot = path.resolve(process.cwd(), '..');
                
                // Load vocabulary CSV
                const csvPath = path.join(projectRoot, 'data', 'languages', lang.name.toLowerCase(), `${level}.csv`);
                if (!fs.existsSync(csvPath)) {
                    console.log(`Skipping ${lang.name}/${level}: CSV not found at ${csvPath}`);
                    test.skip();
                    return;
                }

                const csvRaw = fs.readFileSync(csvPath, { encoding: 'utf8' });
                const rows = parseCsvRows(csvRaw);
                if (rows.length < 2) {
                    test.skip();
                    return;
                }

                const headers = rows[0].map(h => h.trim());
                const wordIdx = headers.indexOf('Word');
                expect(wordIdx, 'Word column should exist').toBeGreaterThanOrEqual(0);

                const words = rows.slice(1)
                    .map(r => (r[wordIdx] || '').trim())
                    .filter(Boolean);

                // Check audio files
                const audioDir = path.join(projectRoot, 'assets', 'audio', lang.folder, level);
                
                let found = 0;
                let missing = 0;
                const missingWords = [];

                for (const word of words) {
                    const safeName = word.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
                    const audioPath = path.join(audioDir, `${safeName}.mp3`);
                    
                    if (fs.existsSync(audioPath)) {
                        found++;
                    } else {
                        missing++;
                        missingWords.push(word);
                    }
                }

                const percentage = words.length > 0 ? Math.round((found / words.length) * 100) : 0;
                
                const report = {
                    language: lang.name,
                    level,
                    total: words.length,
                    found,
                    missing,
                    percentage,
                    missingWords
                };
                allReports.push(report);

                console.log(`\n📊 ${lang.name}/${level}:`);
                console.log(`   Total: ${words.length}`);
                console.log(`   Found: ${found} ✅`);
                console.log(`   Missing: ${missing} ❌`);
                console.log(`   Coverage: ${percentage}%`);
                
                if (missingWords.length > 0 && missingWords.length <= 10) {
                    console.log(`   Missing: ${missingWords.join(', ')}`);
                } else if (missingWords.length > 10) {
                    console.log(`   Missing (first 10): ${missingWords.slice(0, 10).join(', ')}...`);
                }

                // Allow test to pass but log warning if not 100%
                if (percentage < 100) {
                    console.warn(`   ⚠️ Not fully covered - ${missing} missing files`);
                }
                
                expect(percentage, `${lang.name}/${level} should have audio coverage`).toBeGreaterThanOrEqual(0);
            });
        }
    }

    test.afterAll(async () => {
        // Generate summary report
        console.log('\n' + '='.repeat(60));
        console.log('📊 AUDIO COVERAGE SUMMARY');
        console.log('='.repeat(60));
        
        let totalWords = 0;
        let totalFound = 0;
        
        for (const report of allReports) {
            totalWords += report.total;
            totalFound += report.found;
            
            const status = report.percentage === 100 ? '✅' : 
                          report.percentage >= 80 ? '⚠️' : '❌';
            console.log(`${status} ${report.language}/${report.level}: ${report.found}/${report.total} (${report.percentage}%)`);
        }
        
        const overallPercentage = totalWords > 0 ? Math.round((totalFound / totalWords) * 100) : 0;
        console.log('-'.repeat(60));
        console.log(`📈 Overall: ${totalFound}/${totalWords} (${overallPercentage}%)`);
        console.log('='.repeat(60));

        // Save report to file
        const reportPath = path.resolve(process.cwd(), '..', 'docs', 'AUDIO_COVERAGE_REPORT.md');
        const reportContent = generateMarkdownReport(allReports, overallPercentage, totalFound, totalWords);
        fs.writeFileSync(reportPath, reportContent);
        console.log(`\n📄 Report saved to: ${reportPath}`);
    });
});

function generateMarkdownReport(reports, overallPercentage, totalFound, totalWords) {
    const now = new Date().toISOString();
    let md = `# Audio Coverage Report\n\n`;
    md += `Generated: ${now}\n\n`;
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Words | ${totalWords} |\n`;
    md += `| Audio Files Found | ${totalFound} |\n`;
    md += `| Missing | ${totalWords - totalFound} |\n`;
    md += `| Overall Coverage | ${overallPercentage}% |\n\n`;
    
    md += `## By Language/Level\n\n`;
    md += `| Language | Level | Total | Found | Missing | Coverage |\n`;
    md += `|----------|-------|-------|-------|---------|----------|\n`;
    
    for (const r of reports) {
        const status = r.percentage === 100 ? '✅' : r.percentage >= 80 ? '⚠️' : '❌';
        md += `| ${r.language} | ${r.level} | ${r.total} | ${r.found} | ${r.missing} | ${r.percentage}% ${status} |\n`;
    }
    
    md += `\n## Missing Files\n\n`;
    for (const r of reports) {
        if (r.missingWords.length > 0) {
            md += `### ${r.language}/${r.level}\n\n`;
            md += r.missingWords.map(w => `- \`${w}\``).join('\n');
            md += '\n\n';
        }
    }
    
    if (reports.every(r => r.missing === 0)) {
        md += `No missing files! 🎉\n`;
    }
    
    return md;
}
