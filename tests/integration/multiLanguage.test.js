/**
 * Multi-Language Integration Tests
 * 
 * Tests that all languages (Chinese, Japanese, Korean) are correctly
 * configured and can be loaded by the language loader system.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path configuration
const WEB_V3_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(WEB_V3_DIR, 'data');
const AUDIO_DIR = path.join(WEB_V3_DIR, 'assets', 'audio');

// Expected language configurations
const EXPECTED_LANGUAGES = {
    chinese: {
        code: 'zh-CN',
        levels: ['basic', 'intermediate', 'advanced'],
        audioPath: 'chinese',
        languagePath: 'chinese',
        requiredColumns: ['Category', 'Word', 'Pinyin', 'English']
    },
    japanese: {
        code: 'ja-JP',
        levels: ['basic', 'intermediate', 'advanced'],
        audioPath: 'Japanese',
        languagePath: 'japanese',
        requiredColumns: ['Category', 'Word', 'Reading', 'English']
    },
    korean: {
        code: 'ko-KR',
        levels: ['basic', 'intermediate', 'advanced'],
        audioPath: 'Korean',
        languagePath: 'korean',
        requiredColumns: ['Category', 'Word', 'Romanization', 'English']
    }
};

describe('Multi-Language Integration', () => {
    let matrixIndex;

    beforeAll(() => {
        const indexPath = path.join(DATA_DIR, 'matrix_index.json');
        const content = fs.readFileSync(indexPath, 'utf-8');
        matrixIndex = JSON.parse(content);
    });

    describe('matrix_index.json configuration', () => {
        Object.entries(EXPECTED_LANGUAGES).forEach(([lang, config]) => {
            describe(`${lang} language`, () => {
                test(`should have all_levels merged entry`, () => {
                    const entry = matrixIndex.find(e => e.id === `${lang}_all_levels`);
                    expect(entry).toBeDefined();
                    expect(entry.type).toBe('merged');
                    expect(entry.language).toBe(config.code);
                    expect(entry.languagePath).toBe(config.languagePath);
                    expect(entry.audioPath).toBe(config.audioPath);
                    expect(entry.includeLevels).toEqual(config.levels);
                });

                config.levels.forEach(level => {
                    test(`should have ${level} entry with correct properties`, () => {
                        const entry = matrixIndex.find(e => e.id === `${lang}_${level}`);
                        expect(entry).toBeDefined();
                        expect(entry.file).toBe(`languages/${config.languagePath}/${level}.csv`);
                        expect(entry.language).toBe(config.code);
                        expect(entry.languagePath).toBe(config.languagePath);
                        expect(entry.audioPath).toBe(config.audioPath);
                        expect(entry.level).toBe(level);
                    });
                });
            });
        });
    });

    describe('CSV file structure', () => {
        Object.entries(EXPECTED_LANGUAGES).forEach(([lang, config]) => {
            describe(`${lang} CSV files`, () => {
                config.levels.forEach(level => {
                    test(`${level}.csv should exist and have required columns`, () => {
                        const csvPath = path.join(DATA_DIR, 'languages', lang, `${level}.csv`);
                        expect(fs.existsSync(csvPath)).toBe(true);

                        const content = fs.readFileSync(csvPath, 'utf-8');
                        const lines = content.split('\n').filter(l => l.trim());
                        expect(lines.length).toBeGreaterThan(1); // Header + at least 1 row

                        const headers = lines[0].split(',').map(h => h.trim());
                        config.requiredColumns.forEach(col => {
                            expect(headers).toContain(col);
                        });
                    });

                    test(`${level}.csv should have vocabulary data`, () => {
                        const csvPath = path.join(DATA_DIR, 'languages', lang, `${level}.csv`);
                        const content = fs.readFileSync(csvPath, 'utf-8');
                        const lines = content.split('\n').filter(l => l.trim());
                        
                        // Should have header + data rows
                        expect(lines.length).toBeGreaterThanOrEqual(2);
                        
                        // Check first data row has expected columns
                        const headers = lines[0].split(',');
                        const wordIndex = headers.indexOf('Word');
                        expect(wordIndex).toBeGreaterThanOrEqual(0);
                        
                        const firstDataRow = lines[1].split(',');
                        expect(firstDataRow[wordIndex]).toBeTruthy();
                    });
                });
            });
        });
    });

    describe('Audio folder structure', () => {
        Object.entries(EXPECTED_LANGUAGES).forEach(([lang, config]) => {
            describe(`${lang} audio folders`, () => {
                test(`should have ${config.audioPath} folder`, () => {
                    const audioPath = path.join(AUDIO_DIR, config.audioPath);
                    expect(fs.existsSync(audioPath)).toBe(true);
                });

                config.levels.forEach(level => {
                    test(`should have ${level} subfolder`, () => {
                        const levelPath = path.join(AUDIO_DIR, config.audioPath, level);
                        expect(fs.existsSync(levelPath)).toBe(true);
                    });
                });
            });
        });
    });

    describe('Language path consistency', () => {
        test('all languagePath values should be lowercase and match folder names', () => {
            Object.entries(EXPECTED_LANGUAGES).forEach(([lang, config]) => {
                const entries = matrixIndex.filter(e => e.id.startsWith(`${lang}_`));
                entries.forEach(entry => {
                    expect(entry.languagePath).toBe(lang.toLowerCase());
                    
                    // Verify the data folder exists
                    const dataPath = path.join(DATA_DIR, 'languages', entry.languagePath);
                    expect(fs.existsSync(dataPath)).toBe(true);
                });
            });
        });
    });

    describe('Word count validation', () => {
        const wordCounts = {};

        beforeAll(() => {
            Object.entries(EXPECTED_LANGUAGES).forEach(([lang, config]) => {
                wordCounts[lang] = {};
                config.levels.forEach(level => {
                    const csvPath = path.join(DATA_DIR, 'languages', lang, `${level}.csv`);
                    if (fs.existsSync(csvPath)) {
                        const content = fs.readFileSync(csvPath, 'utf-8');
                        const lines = content.split('\n').filter(l => l.trim());
                        wordCounts[lang][level] = lines.length - 1; // Subtract header
                    }
                });
            });
        });

        Object.entries(EXPECTED_LANGUAGES).forEach(([lang]) => {
            test(`${lang} should have vocabulary in all levels`, () => {
                expect(wordCounts[lang]).toBeDefined();
                expect(wordCounts[lang].basic).toBeGreaterThan(0);
                expect(wordCounts[lang].intermediate).toBeGreaterThan(0);
                expect(wordCounts[lang].advanced).toBeGreaterThan(0);
            });
        });

        test('should log word counts for reference', () => {
            console.log('\nWord counts by language/level:');
            Object.entries(wordCounts).forEach(([lang, levels]) => {
                const total = Object.values(levels).reduce((a, b) => a + b, 0);
                console.log(`  ${lang}: ${total} total (basic: ${levels.basic}, intermediate: ${levels.intermediate}, advanced: ${levels.advanced})`);
            });
        });
    });
});
