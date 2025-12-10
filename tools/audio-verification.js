/**
 * Audio Verification Tool
 * Generates coverage reports for audio files across all languages
 * Can be run in browser or Node.js environment
 */

// Coverage report structure
const AudioVerification = {
    /**
     * Generate audio coverage report for a language/level
     * @param {string} language - Language folder (e.g., 'chinese', 'Japanese', 'Korean')
     * @param {string} level - Level ('basic', 'intermediate', 'advanced')
     * @returns {Promise<Object>} Coverage report
     */
    async generateReport(language, level) {
        const report = {
            language,
            level,
            timestamp: new Date().toISOString(),
            vocabulary: [],
            audioFiles: [],
            coverage: {
                total: 0,
                found: 0,
                missing: 0,
                percentage: 0
            },
            issues: []
        };

        try {
            // Load vocabulary
            const vocabPath = `data/languages/${language.toLowerCase()}/${level}.csv`;
            const vocabResponse = await fetch(vocabPath);
            if (!vocabResponse.ok) {
                report.issues.push(`Failed to load vocabulary: ${vocabPath}`);
                return report;
            }

            const vocabText = await vocabResponse.text();
            const vocabWords = this.parseCSV(vocabText);
            report.vocabulary = vocabWords;
            report.coverage.total = vocabWords.length;

            // Check each word for audio file
            const audioBasePath = `assets/audio/${language}/${level}`;
            
            for (const word of vocabWords) {
                // sanitize the word to match audio filename normalization (replace illegal chars with underscore)
                const safe = word.replace(/[\/\\:*?"<>|]/g, '_').trim();
                const enc = encodeURIComponent(safe);
                const audioPath = `${audioBasePath}/${enc}.mp3`;
                const exists = await this.checkAudioExists(audioPath);
                
                if (exists) {
                    report.coverage.found++;
                    report.audioFiles.push({
                        word,
                        path: audioPath,
                        status: 'found'
                    });
                } else {
                    report.coverage.missing++;
                    report.audioFiles.push({
                        word,
                        path: audioPath,
                        status: 'missing'
                    });
                    report.issues.push(`Missing audio: ${word}`);
                }
            }

            // Calculate percentage
            report.coverage.percentage = report.coverage.total > 0
                ? Math.round((report.coverage.found / report.coverage.total) * 100)
                : 0;

        } catch (error) {
            report.issues.push(`Error: ${error.message}`);
        }

        return report;
    },

    /**
     * Generate full coverage report for all languages and levels
     * @returns {Promise<Object>} Full coverage report
     */
    async generateFullReport() {
        const languages = ['chinese', 'Japanese', 'Korean'];
        const levels = ['basic', 'intermediate', 'advanced'];
        
        const fullReport = {
            timestamp: new Date().toISOString(),
            languages: {},
            summary: {
                totalWords: 0,
                totalFound: 0,
                totalMissing: 0,
                overallPercentage: 0
            }
        };

        for (const language of languages) {
            fullReport.languages[language] = {};
            
            for (const level of levels) {
                const report = await this.generateReport(language, level);
                fullReport.languages[language][level] = report;
                
                fullReport.summary.totalWords += report.coverage.total;
                fullReport.summary.totalFound += report.coverage.found;
                fullReport.summary.totalMissing += report.coverage.missing;
            }
        }

        fullReport.summary.overallPercentage = fullReport.summary.totalWords > 0
            ? Math.round((fullReport.summary.totalFound / fullReport.summary.totalWords) * 100)
            : 0;

        return fullReport;
    },

    /**
     * Parse CSV and extract Word column
     * @param {string} csvText - CSV content
     * @returns {Array<string>} Array of words
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = this.parseCSVLine(lines[0]);
        const wordIdx = headers.findIndex(h => h.trim().toLowerCase() === 'word');
        if (wordIdx < 0) return [];

        const words = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const word = (values[wordIdx] || '').trim();
            if (word) words.push(word);
        }

        return words;
    },

    /**
     * RFC4180 compliant CSV line parser
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (inQuotes) {
                if (char === '"' && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else if (char === '"') {
                    inQuotes = false;
                } else {
                    current += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
        }
        result.push(current.trim());
        return result;
    },

    /**
     * Check if audio file exists
     * @param {string} path - Audio file path
     * @returns {Promise<boolean>}
     */
    async checkAudioExists(path) {
        try {
            const response = await fetch(path, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    },

    /**
     * Display coverage report in console with colors
     * @param {Object} report - Coverage report
     */
    displayReport(report) {
        console.group(`📊 Audio Coverage: ${report.language}/${report.level}`);
        console.log(`Total words: ${report.coverage.total}`);
        console.log(`Found: ${report.coverage.found} ✅`);
        console.log(`Missing: ${report.coverage.missing} ❌`);
        console.log(`Coverage: ${report.coverage.percentage}%`);
        
        if (report.issues.length > 0) {
            console.group('Issues:');
            report.issues.forEach(issue => console.warn(issue));
            console.groupEnd();
        }
        console.groupEnd();
    },

    /**
     * Display full report summary
     * @param {Object} fullReport - Full coverage report
     */
    displayFullReport(fullReport) {
        console.group('📊 Full Audio Coverage Report');
        console.log(`Generated: ${fullReport.timestamp}`);
        console.log('');
        
        for (const [language, levels] of Object.entries(fullReport.languages)) {
            console.group(`🌐 ${language}`);
            for (const [level, report] of Object.entries(levels)) {
                const status = report.coverage.percentage === 100 ? '✅' : 
                               report.coverage.percentage >= 80 ? '⚠️' : '❌';
                console.log(`  ${level}: ${report.coverage.found}/${report.coverage.total} (${report.coverage.percentage}%) ${status}`);
            }
            console.groupEnd();
        }
        
        console.log('');
        console.log(`📈 Overall: ${fullReport.summary.totalFound}/${fullReport.summary.totalWords} (${fullReport.summary.overallPercentage}%)`);
        console.groupEnd();
    },

    /**
     * Create HTML report element
     * @param {Object} fullReport - Full coverage report
     * @returns {HTMLElement}
     */
    createReportElement(fullReport) {
        const container = document.createElement('div');
        container.className = 'audio-verification-report';
        container.innerHTML = `
            <style>
                .audio-verification-report {
                    font-family: system-ui, -apple-system, sans-serif;
                    padding: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .report-summary {
                    background: #f0f4f8;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .language-section {
                    margin-bottom: 20px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    overflow: hidden;
                }
                .language-header {
                    background: #007AFF;
                    color: white;
                    padding: 10px 15px;
                    font-weight: bold;
                }
                .level-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 15px;
                    border-bottom: 1px solid #eee;
                }
                .level-row:last-child {
                    border-bottom: none;
                }
                .status-ok { color: #34C759; }
                .status-warn { color: #FF9500; }
                .status-error { color: #FF3B30; }
                .progress-bar {
                    width: 100px;
                    height: 8px;
                    background: #eee;
                    border-radius: 4px;
                    overflow: hidden;
                    display: inline-block;
                    margin-left: 10px;
                }
                .progress-fill {
                    height: 100%;
                    background: #34C759;
                    transition: width 0.3s;
                }
            </style>
            <div class="report-header">
                <h2>🎵 Audio Coverage Report</h2>
                <p>Generated: ${new Date(fullReport.timestamp).toLocaleString()}</p>
            </div>
            <div class="report-summary">
                <h3>Overall Coverage: ${fullReport.summary.overallPercentage}%</h3>
                <p>${fullReport.summary.totalFound} / ${fullReport.summary.totalWords} audio files found</p>
                <div class="progress-bar" style="width: 200px;">
                    <div class="progress-fill" style="width: ${fullReport.summary.overallPercentage}%;"></div>
                </div>
            </div>
            ${Object.entries(fullReport.languages).map(([language, levels]) => `
                <div class="language-section">
                    <div class="language-header">🌐 ${language}</div>
                    ${Object.entries(levels).map(([level, report]) => {
                        const statusClass = report.coverage.percentage === 100 ? 'status-ok' : 
                                           report.coverage.percentage >= 80 ? 'status-warn' : 'status-error';
                        const statusIcon = report.coverage.percentage === 100 ? '✅' : 
                                          report.coverage.percentage >= 80 ? '⚠️' : '❌';
                        return `
                            <div class="level-row">
                                <span>${level.charAt(0).toUpperCase() + level.slice(1)}</span>
                                <span class="${statusClass}">
                                    ${report.coverage.found}/${report.coverage.total} 
                                    (${report.coverage.percentage}%) ${statusIcon}
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${report.coverage.percentage}%;"></div>
                                    </div>
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `).join('')}
        `;
        return container;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioVerification;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.AudioVerification = AudioVerification;
}
