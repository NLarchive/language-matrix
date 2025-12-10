/**
 * Radical System Test Suite
 * Verifies that all levels have proper radical configurations and audio files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../../');

describe('Radical System Tests', () => {
    const levels = ['basic', 'intermediate', 'advanced'];
    const audioBasePath = path.join(rootDir, 'assets/audio/chinese');

    test('All required audio folders exist', () => {
        levels.forEach(level => {
            const levelPath = path.join(audioBasePath, level);
            expect(fs.existsSync(levelPath)).toBe(true);
        });
    });

    test('Audio files exist for all levels', () => {
        levels.forEach(level => {
            const levelPath = path.join(audioBasePath, level);
            const files = fs.readdirSync(levelPath).filter(f => f.endsWith('.mp3'));
            expect(files.length).toBeGreaterThan(0);
            console.log(`  ${level}: ${files.length} audio files`);
        });
    });

    test('Radicals CSV file exists', () => {
        const radicalsPath = path.join(rootDir, 'data/languages/chinese/radicals/radicals.csv');
        expect(fs.existsSync(radicalsPath)).toBe(true);
    });

    test('All level CSV files exist', () => {
        levels.forEach(level => {
            const csvPath = path.join(rootDir, `data/languages/chinese/${level}.csv`);
            expect(fs.existsSync(csvPath)).toBe(true);
        });
    });

    test('Vocabulary CSV files have content', () => {
        levels.forEach(level => {
            const csvPath = path.join(rootDir, `data/languages/chinese/${level}.csv`);
            const content = fs.readFileSync(csvPath, 'utf-8');
            const lines = content.trim().split('\n');
            expect(lines.length).toBeGreaterThan(1); // header + at least one word
            console.log(`  ${level}.csv: ${lines.length - 1} words`);
        });
    });

    test('Word radicals cover all levels', () => {
        // Verify that vocabulary words exist for all levels
        const levels = ['basic', 'intermediate', 'advanced'];
        const levelCounts = {};
        levels.forEach(level => levelCounts[level] = 0);

        levels.forEach(level => {
            const csvPath = path.join(rootDir, `data/languages/chinese/${level}.csv`);
            const content = fs.readFileSync(csvPath, 'utf-8');
            const lines = content.trim().split('\n');
            levelCounts[level] = lines.length - 1; // Exclude header
        });

        levels.forEach(level => {
            expect(levelCounts[level]).toBeGreaterThan(0);
            console.log(`  ${level}: ${levelCounts[level]} composable words`);
        });
    });

    test('Radicals CSV has required columns', () => {
        const radicalsPath = path.join(rootDir, 'data/languages/chinese/radicals/radicals.csv');
        const content = fs.readFileSync(radicalsPath, 'utf-8');
        const lines = content.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        expect(headers).toContain('Radical');
        expect(headers).toContain('Meaning');
        expect(headers).toContain('Pinyin');
    });

    test('Audio files match vocabulary in all levels', () => {
        levels.forEach(level => {
            const csvPath = path.join(rootDir, `data/languages/chinese/${level}.csv`);
            const content = fs.readFileSync(csvPath, 'utf-8');
            const lines = content.trim().split('\n');
            
            // Skip header
            const words = lines.slice(1).map(line => {
                const parts = line.split(',');
                return parts[1]?.trim(); // Get Word column
            }).filter(w => w);

            const audioPath = path.join(rootDir, `assets/audio/chinese/${level}`);
            const audioFiles = fs.readdirSync(audioPath)
                .filter(f => f.endsWith('.mp3'))
                .map(f => f.replace('.mp3', ''));

            // Check that at least 50% of words have audio
            const matchedCount = words.filter(w => audioFiles.includes(w)).length;
            const matchPercentage = (matchedCount / words.length) * 100;
            
            console.log(`  ${level}: ${matchedCount}/${words.length} words (${matchPercentage.toFixed(1)}%) have audio`);
            expect(matchPercentage).toBeGreaterThanOrEqual(50);
        });
    });

    test('All levels have non-zero audio files', () => {
        levels.forEach(level => {
            const audioPath = path.join(rootDir, `assets/audio/chinese/${level}`);
            const files = fs.readdirSync(audioPath).filter(f => f.endsWith('.mp3'));
            
            files.forEach(file => {
                const filePath = path.join(audioPath, file);
                const stats = fs.statSync(filePath);
                expect(stats.size).toBeGreaterThan(0);
            });
        });
    });

    test('HTML index file has required tabs structure', () => {
        const indexPath = path.join(rootDir, 'index.html');
        const content = fs.readFileSync(indexPath, 'utf-8');
        
        // Check for vocabulary tab
        expect(content).toContain('data-tab="vocabulary"');
        expect(content).toContain('vocabulary-tab');
        
        // Check for radicals tab
        expect(content).toContain('data-tab="radicals"');
        expect(content).toContain('radicals-tab');
        
        // Check for tab navigation buttons
        expect(content).toContain('tab-btn');
        expect(content).toContain('tab-navigation');
    });

    test('Radicals tab container exists for display', () => {
        const indexPath = path.join(rootDir, 'index.html');
        const content = fs.readFileSync(indexPath, 'utf-8');
        
        // Verify radicals content container exists
        expect(content).toContain('id="radicals-content"');
        expect(content).toContain('class="radicals-container"');
    });
});
