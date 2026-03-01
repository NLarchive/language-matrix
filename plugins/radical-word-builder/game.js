/**
 * Radical Word Builder Game
 * A standalone game for building Chinese words from radicals
 * Uses all 350 radicals from radicals.csv
 */

class RadicalWordBuilder {
    constructor() {
        this.radicals = [];
        this.words = [];
        this.composedRadicals = [];
        this.foundWords = new Set();
        this.score = 0;
        this.streak = 0;
        this.currentMode = 'free';
        this.usedRadicals = new Set();
        
        // Base path to data files (relative to plugin location)
        this.dataBasePath = '../../data/languages/chinese/';
        
        this.init();
    }
    
    async init() {
        try {
            console.log('[RadicalWordBuilder] Starting initialization...');
            console.log('[RadicalWordBuilder] Data base path:', this.dataBasePath);
            
            await this.loadRadicals();
            console.log(`[RadicalWordBuilder] Loaded ${this.radicals.length} radicals from radicals.csv`);
            
            await this.loadWords();
            console.log(`[RadicalWordBuilder] Loaded ${this.words.length} words from vocabulary CSVs`);
            
            this.setupEventListeners();
            this.renderRadicals();
            this.renderWordDatabase();
            this.renderFoundWords();
            this.updateStats();
            
            console.log(`[RadicalWordBuilder] Initialization complete! ${this.radicals.length} radicals, ${this.words.length} words`);
        } catch (error) {
            console.error('[RadicalWordBuilder] Failed to initialize game:', error);
            this.showError('Failed to load game data. Please check console and refresh.');
        }
    }
    
    async loadRadicals() {
        const url = `${this.dataBasePath}radicals/radicals.csv`;
        console.log(`[RadicalWordBuilder] Loading radicals from: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load radicals.csv (HTTP ${response.status})`);
        
        const text = await response.text();
        const lines = text.trim().split('\n');
        const headers = this.parseCSVLine(lines[0]);
        
        console.log(`[RadicalWordBuilder] radicals.csv headers:`, headers);
        
        // Find column indices by header name
        const radicalIdx = headers.findIndex(h => h.toLowerCase() === 'radical');
        const pinyinIdx = headers.findIndex(h => h.toLowerCase() === 'pinyin');
        const descriptionIdx = headers.findIndex(h => h.toLowerCase() === 'description');
        const meaningIdx = headers.findIndex(h => h.toLowerCase() === 'meaning');
        
        console.log(`[RadicalWordBuilder] Radical column indices - Radical: ${radicalIdx}, Pinyin: ${pinyinIdx}, Description: ${descriptionIdx}, Meaning: ${meaningIdx}`);
        
        this.radicals = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length >= 1 && values[radicalIdx]) {
                this.radicals.push({
                    character: values[radicalIdx] || '',
                    pinyin: pinyinIdx >= 0 ? (values[pinyinIdx] || '') : '',
                    description: descriptionIdx >= 0 ? (values[descriptionIdx] || '') : '',
                    meaning: meaningIdx >= 0 ? (values[meaningIdx] || '') : ''
                });
            }
        }
    }
    
    async loadWords() {
        const levels = ['basic', 'intermediate', 'advanced'];
        this.words = [];
        
        for (const level of levels) {
            try {
                const response = await fetch(`${this.dataBasePath}${level}.csv`);
                if (!response.ok) continue;
                
                const text = await response.text();
                const lines = text.trim().split('\n');
                const headers = this.parseCSVLine(lines[0]);
                
                // Find column indices - vocabulary CSVs use "Word" column (not "Hanzi")
                const wordIdx = headers.findIndex(h => h.toLowerCase() === 'word');
                const pinyinIdx = headers.findIndex(h => h.toLowerCase() === 'pinyin');
                const englishIdx = headers.findIndex(h => h.toLowerCase() === 'english');
                const radicalsIdx = headers.findIndex(h => h.toLowerCase() === 'radicals');
                
                console.log(`[RadicalWordBuilder] ${level}.csv headers:`, headers);
                console.log(`[RadicalWordBuilder] Column indices - Word: ${wordIdx}, Pinyin: ${pinyinIdx}, English: ${englishIdx}, Radicals: ${radicalsIdx}`);
                
                if (wordIdx === -1 || radicalsIdx === -1) {
                    console.warn(`[RadicalWordBuilder] Missing required columns in ${level}.csv - Word: ${wordIdx}, Radicals: ${radicalsIdx}`);
                    continue;
                }
                
                for (let i = 1; i < lines.length; i++) {
                    const values = this.parseCSVLine(lines[i]);
                    if (values.length > Math.max(wordIdx, radicalsIdx)) {
                        const radicalsPart = values[radicalsIdx] || '';
                        const radicals = radicalsPart.split('+').map(r => r.trim()).filter(r => r);
                        
                        if (radicals.length > 0) {
                            this.words.push({
                                hanzi: values[wordIdx],
                                pinyin: values[pinyinIdx] || '',
                                english: values[englishIdx] || '',
                                radicals: radicals,
                                level: level
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn(`Could not load ${level}.csv:`, e);
            }
        }
        
        // Remove duplicates based on hanzi
        const seen = new Set();
        this.words = this.words.filter(w => {
            if (seen.has(w.hanzi)) return false;
            seen.add(w.hanzi);
            return true;
        });
    }
    
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }
    
    setupEventListeners() {
        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
        });
        
        // Composition area buttons - with null checks
        const checkBtn = document.getElementById('check-btn');
        if (checkBtn) checkBtn.addEventListener('click', () => this.checkComposition());
        
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearComposition());
        
        const shuffleBtn = document.getElementById('shuffle-btn');
        if (shuffleBtn) shuffleBtn.addEventListener('click', () => this.shuffleRadicals());
        
        // Search
        const searchInput = document.getElementById('radical-search');
        if (searchInput) searchInput.addEventListener('input', (e) => this.filterRadicals(e.target.value));
        
        // Stroke filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.filterByStrokes(btn.dataset.filter));
        });
        
        // Database filters
        const levelFilter = document.getElementById('level-filter');
        if (levelFilter) levelFilter.addEventListener('change', () => this.renderWordDatabase());
        
        const radicalCountFilter = document.getElementById('radical-count-filter');
        if (radicalCountFilter) radicalCountFilter.addEventListener('change', () => this.renderWordDatabase());
        
        // Modal close
        const closeBtn = document.querySelector('.close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        
        const wordModal = document.getElementById('word-modal');
        if (wordModal) wordModal.addEventListener('click', (e) => {
            if (e.target === wordModal) this.closeModal();
        });
        
        // Composition canvas drag/drop
        const canvas = document.getElementById('composition-canvas');
        if (canvas) {
            canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
                canvas.classList.add('drag-over');
            });
            canvas.addEventListener('dragleave', () => {
                canvas.classList.remove('drag-over');
            });
            canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                canvas.classList.remove('drag-over');
                const radicalChar = e.dataTransfer.getData('text/plain');
                this.addRadicalToComposition(radicalChar);
            });
        }
        
        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetGame());
    }
    
    setMode(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        if (mode === 'challenge') {
            this.startChallenge();
        } else if (mode === 'practice') {
            this.startPractice();
        }
    }
    
    startChallenge() {
        // Reset and give random target words to find
        this.clearComposition();
        // Challenge mode could have time limits, targets, etc.
        console.log('Challenge mode started');
    }
    
    startPractice() {
        // Practice mode - show hints
        console.log('Practice mode started');
    }
    
    renderRadicals(filter = '') {
        const grid = document.getElementById('radicals-grid');
        grid.innerHTML = '';
        
        let filtered = this.radicals;
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            filtered = this.radicals.filter(r => 
                r.character.includes(filter) ||
                r.pinyin.toLowerCase().includes(lowerFilter) ||
                r.meaning.toLowerCase().includes(lowerFilter)
            );
        }
        
        filtered.forEach(radical => {
            const card = document.createElement('div');
            card.className = 'radical-card';
            if (this.usedRadicals.has(radical.character)) {
                card.classList.add('used');
            }
            card.draggable = true;
            card.dataset.char = radical.character;
            
            card.innerHTML = `
                <div class="radical-char">${radical.character}</div>
                <div class="radical-pinyin">${radical.pinyin}</div>
                <div class="radical-meaning">${radical.meaning}</div>
            `;
            
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', radical.character);
                card.classList.add('dragging');
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
            
            card.addEventListener('click', () => {
                this.addRadicalToComposition(radical.character);
            });
            
            grid.appendChild(card);
        });
    }
    
    filterRadicals(query) {
        this.renderRadicals(query);
    }
    
    filterByStrokes(strokes) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.strokes === strokes);
        });
        
        if (strokes === 'all') {
            this.renderRadicals();
        } else {
            // For now, just render all - stroke data would need to be added
            this.renderRadicals();
        }
    }
    
    shuffleRadicals() {
        // Fisher-Yates shuffle
        for (let i = this.radicals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.radicals[i], this.radicals[j]] = [this.radicals[j], this.radicals[i]];
        }
        this.renderRadicals();
    }
    
    addRadicalToComposition(radicalChar) {
        const radical = this.radicals.find(r => r.character === radicalChar);
        if (!radical) return;
        
        this.composedRadicals.push(radical);
        this.renderComposition();
    }
    
    renderComposition() {
        const canvas = document.getElementById('composition-canvas');
        const result = document.getElementById('composition-result');
        result.className = 'composition-result';
        result.style.display = 'none';
        
        if (this.composedRadicals.length === 0) {
            canvas.innerHTML = '<span class="canvas-placeholder">Drag radicals here or click them to compose a word</span>';
            return;
        }
        
        canvas.innerHTML = this.composedRadicals.map((r, i) => `
            <div class="canvas-radical" data-index="${i}">
                <span class="radical-char">${r.character}</span>
                <span class="radical-pinyin">${r.pinyin}</span>
            </div>
        `).join('');
        
        // Allow removing radicals by clicking
        canvas.querySelectorAll('.canvas-radical').forEach(el => {
            el.addEventListener('click', () => {
                const index = parseInt(el.dataset.index);
                this.composedRadicals.splice(index, 1);
                this.renderComposition();
            });
        });
    }
    
    clearComposition() {
        this.composedRadicals = [];
        this.renderComposition();
    }
    
    checkComposition() {
        if (this.composedRadicals.length === 0) return;
        
        const composedChars = this.composedRadicals.map(r => r.character);
        const composedKey = composedChars.join('+');
        
        // Find matching word
        const match = this.words.find(word => {
            const wordKey = word.radicals.join('+');
            return wordKey === composedKey;
        });
        
        const result = document.getElementById('composition-result');
        
        if (match) {
            // Success!
            if (!this.foundWords.has(match.hanzi)) {
                this.foundWords.add(match.hanzi);
                this.score += match.radicals.length * 10;
                this.streak++;
                
                // Mark radicals as used
                composedChars.forEach(c => this.usedRadicals.add(c));
                this.renderRadicals();
            }
            
            result.className = 'composition-result success';
            result.innerHTML = `
                <div class="result-word">${match.hanzi}</div>
                <div class="result-info">
                    <strong>${match.pinyin}</strong> - ${match.english}
                    <br>+${match.radicals.length * 10} points!
                </div>
            `;
            
            this.updateStats();
            this.renderWordDatabase();
            this.renderFoundWords();
        } else {
            // No match
            this.streak = 0;
            result.className = 'composition-result error';
            result.innerHTML = `
                <div class="result-info">
                    No word found with radicals: ${composedChars.join(' + ')}
                    <br>Try a different combination!
                </div>
            `;
            this.updateStats();
        }
    }
    
    updateStats() {
        document.getElementById('radicals-count').textContent = this.radicals.length;
        document.getElementById('words-found').textContent = this.foundWords.size;
        document.getElementById('total-words').textContent = this.words.length;
        document.getElementById('score').textContent = this.score;
        document.getElementById('streak').textContent = this.streak;
    }
    
    renderFoundWords() {
        const container = document.getElementById('found-words-list');
        
        if (this.foundWords.size === 0) {
            container.innerHTML = '<span class="empty-message">No words found yet. Start composing!</span>';
            return;
        }
        
        const foundWordsList = Array.from(this.foundWords).map(hanzi => 
            this.words.find(w => w.hanzi === hanzi)
        ).filter(w => w);
        
        container.innerHTML = foundWordsList.map(word => `
            <div class="word-chip" data-hanzi="${word.hanzi}">
                <span class="word-hanzi">${word.hanzi}</span>
                <span class="word-pinyin">${word.pinyin}</span>
            </div>
        `).join('');
        
        container.querySelectorAll('.word-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.showWordDetail(chip.dataset.hanzi);
            });
        });
    }
    
    renderWordDatabase() {
        const container = document.getElementById('word-database');
        const levelFilter = document.getElementById('level-filter').value;
        const radicalCountFilter = document.getElementById('radical-count-filter').value;
        
        let filtered = this.words;
        
        if (levelFilter !== 'all') {
            filtered = filtered.filter(w => w.level === levelFilter);
        }
        
        if (radicalCountFilter !== 'all') {
            const count = parseInt(radicalCountFilter);
            filtered = filtered.filter(w => w.radicals.length === count);
        }
        
        // Limit display for performance
        const displayed = filtered.slice(0, 100);
        
        container.innerHTML = displayed.map(word => `
            <div class="db-word-card ${this.foundWords.has(word.hanzi) ? 'found' : ''}" data-hanzi="${word.hanzi}">
                <div class="db-word-hanzi">${word.hanzi}</div>
                <div class="db-word-pinyin">${word.pinyin}</div>
                <div class="db-word-radicals">${word.radicals.join(' + ')}</div>
            </div>
        `).join('');
        
        if (displayed.length < filtered.length) {
            container.innerHTML += `<div class="empty-message">Showing ${displayed.length} of ${filtered.length} words</div>`;
        }
        
        container.querySelectorAll('.db-word-card').forEach(card => {
            card.addEventListener('click', () => {
                this.showWordDetail(card.dataset.hanzi);
            });
        });
    }
    
    showWordDetail(hanzi) {
        const word = this.words.find(w => w.hanzi === hanzi);
        if (!word) return;
        
        const modalBody = document.getElementById('modal-body');
        
        const radicalsHtml = word.radicals.map(radChar => {
            const radInfo = this.radicals.find(r => r.character === radChar);
            return `
                <div class="modal-radical">
                    <span class="char">${radChar}</span>
                    <span class="meaning">${radInfo ? radInfo.meaning : ''}</span>
                </div>
            `;
        }).join('');
        
        modalBody.innerHTML = `
            <h2>${word.hanzi}</h2>
            <div class="modal-pinyin">${word.pinyin}</div>
            <div class="modal-english">${word.english}</div>
            <h4>Radicals:</h4>
            <div class="modal-radicals">${radicalsHtml}</div>
            <div class="modal-level">Level: ${word.level}</div>
        `;
        
        document.getElementById('word-modal').classList.add('active');
    }
    
    closeModal() {
        document.getElementById('word-modal').classList.remove('active');
    }
    
    resetGame() {
        this.score = 0;
        this.streak = 0;
        this.foundWords.clear();
        this.usedRadicals.clear();
        this.composedRadicals = [];
        
        this.renderComposition();
        this.renderRadicals();
        this.renderFoundWords();
        this.renderWordDatabase();
        this.updateStats();
    }
    
    showError(message) {
        document.querySelector('main').innerHTML = `
            <div class="loading">${message}</div>
        `;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new RadicalWordBuilder();
});
