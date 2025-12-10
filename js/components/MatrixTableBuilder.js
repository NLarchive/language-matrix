export class MatrixTableBuilder {
    constructor(containerId, onWordSelect) {
        this.container = document.getElementById(containerId);
        this.onWordSelect = onWordSelect;
        this.selectedWords = {};
        this.categoryOrder = [];
        this.currentLevel = 'basic'; // default level
        this.currentLanguage = 'chinese'; // default language
        this.radicals = []; // Radicals data for modal display
        this.radicalsLanguage = 'chinese';
        this.wordRadicals = {}; // Word-to-radical mappings
        this.radicalLoader = null; // Reference to radicalLoader for variant matching
    }

    /**
     * Set radicals data for modal display
     * @param {Array} radicals - Array of radical objects
     * @param {string} language - Language path
     */
    setRadicals(radicals, language = 'chinese') {
        this.radicals = radicals || [];
        this.radicalsLanguage = language;
    }

    /**
     * Set word-radical mappings for modal display
     * @param {Object} wordRadicals - Object mapping words to their radicals
     */
    setWordRadicals(wordRadicals) {
        this.wordRadicals = wordRadicals || {};
    }

    /**
     * Set radical loader reference for variant matching and meaning lookup
     * @param {RadicalLoader} loader - RadicalLoader instance
     */
    setRadicalLoader(loader) {
        this.radicalLoader = loader;
    }

    /**
     * Calculate the best text color (black or white) for a given background color
     * @param {string} hexColor - Hex color code (e.g., '#FF6B6B')
     * @returns {string} - 'white' or 'black'
     */
    getContrastColor(hexColor) {
        const color = hexColor.replace('#', '');
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }

    render(vocabData, categoryConfig, level = 'basic', language = 'chinese') {
        this.container.innerHTML = '';
        this.selectedWords = {};
        this.currentLevel = level;
        this.currentLanguage = language;
        
        const { grouped: vocabMatrix, categoryOrder } = vocabData;
        this.categoryOrder = categoryOrder;
        
        const table = document.createElement('table');
        table.className = 'matrix-table';
        
        // Create header row with categories
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        categoryOrder.forEach(category => {
            const th = document.createElement('th');
            const config = categoryConfig[category] || {};
            const bgColor = config.color || '#007AFF';
            th.style.backgroundColor = bgColor;
            th.style.color = this.getContrastColor(bgColor);
            
            th.innerHTML = `
                <div class="category-header">
                    <div class="category-name">${category}</div>
                    <div class="category-description">${config.description || ''}</div>
                </div>
            `;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body with word cells
        const tbody = document.createElement('tbody');
        
        // Find max length to create equal rows
        const maxLength = Math.max(...Object.values(vocabMatrix).map(arr => arr.length));
        
        for (let i = 0; i < maxLength; i++) {
            const row = document.createElement('tr');
            
            categoryOrder.forEach(category => {
                const td = document.createElement('td');
                const words = vocabMatrix[category];
                
                if (words && i < words.length) {
                    const wordData = words[i];
                    const cell = this.createWordCell(wordData, category);
                    if (cell) td.appendChild(cell);
                }
                
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
        }
        
        table.appendChild(tbody);
        this.container.appendChild(table);
        
        // Check if horizontal scroll needed
        this.checkScrollState();
        window.addEventListener('resize', () => this.checkScrollState());
    }
    
    checkScrollState() {
        const container = this.container.closest('.matrix-table-container');
        if (container && container.scrollWidth > container.clientWidth) {
            container.classList.add('can-scroll');
        } else if (container) {
            container.classList.remove('can-scroll');
        }
    }

    createWordCell(wordData, category) {
        // Defensive: if the data is missing or malformed, skip rendering this cell
        if (!wordData || !wordData.Word) {
            console.warn('[MatrixTableBuilder] Skipping invalid wordData:', wordData, 'category:', category);
            return null;
        }
        const cell = document.createElement('div');
        cell.className = 'word-cell';
        
        const btn = document.createElement('button');
        btn.className = 'word-btn';
        btn.dataset.category = category;
        btn.dataset.word = wordData.Word;
        
        btn.innerHTML = `
            <div class="word-chinese">${wordData.Word}</div>
            <div class="word-pinyin">${wordData.Pinyin || wordData.Reading || wordData.Romanization || ''}</div>
            <div class="word-english">${wordData.English || ''}</div>
            <div class="word-actions">
                <button class="audio-mini-btn" data-audio="${wordData.Word}" aria-label="Play audio">
                    <svg class="audio-icon-mini" viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                    </svg>
                </button>
                <button class="info-mini-btn" data-word="${wordData.Word}" aria-label="Show details">
                    <svg class="info-icon-mini" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                </button>
            </div>
        `;
        
        btn.onclick = (e) => {
            if (e.target.closest('.audio-mini-btn')) {
                e.stopPropagation();
                this.playAudio(wordData);
                return;
            }
            
            if (e.target.closest('.info-mini-btn')) {
                e.stopPropagation();
                this.showWordDetails(wordData);
                return;
            }
            
            this.selectWord(category, wordData, btn);
        };
        
        cell.appendChild(btn);
        return cell;
    }

    selectWord(category, wordData, btnElement) {
        // Deselect previous selection in this category
        const prevSelected = this.container.querySelector(`[data-category="${category}"].selected`);
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }
        
        // Toggle selection
        if (this.selectedWords[category]?.Word === wordData.Word) {
            delete this.selectedWords[category];
        } else {
            btnElement.classList.add('selected');
            this.selectedWords[category] = wordData;
        }
        
        // Notify callback with category order for proper sentence building
        this.onWordSelect(this.selectedWords, this.categoryOrder);
    }

    /**
     * Sanitize word for use as filename by replacing invalid characters
     * @param {string} word - The word to sanitize
     * @returns {string} Sanitized filename-safe word
     */
    sanitizeFilename(word) {
        if (!word || typeof word !== 'string') return '';
        // Map problematic filename characters to underscore to match asset naming used elsewhere
        return word.replace(/[\/\\:*?"<>|]/g, '_').trim();
    }

    async playAudio(wordData) {
        // Build a prioritized list of candidate levels to try for audio
        // Use the word's own level first when present, otherwise use the current matrix level.
        // If the selected matrix is a combined/all level (e.g., 'all' or 'all_levels') then
        // we prefer the word's level; if missing, fall back to a fixed order.
        const current = (this.currentLevel || '').toString().toLowerCase();
        const wordLevel = wordData.Level ? wordData.Level.toString().toLowerCase() : null;

        const candidates = [];
        if (wordLevel && wordLevel !== 'all' && wordLevel !== 'all_levels') candidates.push(wordLevel);
        if (current && current !== 'all' && current !== 'all_levels') candidates.push(current);

        // final fallback order if nothing matched or file missing
        ['basic', 'intermediate', 'advanced'].forEach(l => {
            if (!candidates.includes(l)) candidates.push(l);
        });

        if (window.audioCache) {
            for (const lvl of candidates) {
                // Use language-aware path: assets/audio/{language}/{level}/{word}.mp3
                // Fall back to old path for backward compatibility: assets/audio/{level}/{word}.mp3
                // prefer audio path matching the configured audio folder in audioCache (may be capitalized)
                const audioFolder = (window.audioCache && window.audioCache.currentLanguage) ? window.audioCache.currentLanguage : this.currentLanguage;
                const sanitizedWord = this.sanitizeFilename(wordData.Word);
                const encodedName = encodeURIComponent(sanitizedWord);
                const langPath = `assets/audio/${audioFolder}/${lvl}/${encodedName}.mp3`;
                const legacyPath = `assets/audio/${lvl}/${encodedName}.mp3`;
                
                for (const path of [langPath, legacyPath]) {
                    try {
                        const blob = await window.audioCache.getAudio(path, lvl, true);
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const audio = new Audio();
                            audio.preload = 'auto';
                            
                            // Use both canplaythrough and loadeddata for maximum compatibility
                            let ready = false;
                            const playWhenReady = () => {
                                if (ready) return;
                                ready = true;
                                // 200ms delay to ensure audio context is fully initialized
                                setTimeout(() => {
                                    audio.play().catch(e => console.log("Audio playback failed:", e));
                                }, 200);
                            };
                            
                            audio.oncanplaythrough = playWhenReady;
                            audio.onloadeddata = playWhenReady;
                            audio.onended = () => URL.revokeObjectURL(url);
                            audio.onerror = () => URL.revokeObjectURL(url);
                            
                            // Set source after handlers are attached
                            audio.src = url;
                            audio.load();
                            return;
                        }
                    } catch (e) {
                        // continue to next path
                    }
                }
            }

            console.warn('[MatrixTableBuilder] Audio not found for word in any level:', wordData.Word);
        } else {
            // Fallback if audioCache is not available -- try current or basic
            const fallbackLevel = wordLevel || current || 'basic';
            const sanitizedWord = this.sanitizeFilename(wordData.Word);
            const audio = new Audio(`assets/audio/${fallbackLevel}/${sanitizedWord}.mp3`);
            audio.play().catch(e => console.log("Audio playback failed:", e));
        }
    }

    showWordDetails(wordData) {
        const modal = document.getElementById('word-modal');
        const modalContent = document.getElementById('modal-content');
        
        // Find radicals in this character
        const foundRadicals = this.findRadicalsInWord(wordData.Word);
        let radicalsHtml = '';
        
        if (foundRadicals.length > 0) {
            radicalsHtml = `
                <div class="word-detail-radicals">
                    <h4 class="radicals-section-title">Component Radicals</h4>
                    <div class="radicals-in-word">
                        ${foundRadicals.map(r => `
                            <div class="radical-chip" title="${r.Meaning || ''}">
                                <span class="radical-chip-char">${r.Radical}</span>
                                <span class="radical-chip-info">
                                    <span class="radical-chip-pinyin">${r.Pinyin || r.Reading || r.Romanization || ''}</span>
                                    <span class="radical-chip-meaning">${this.truncateText(r.Meaning || '', 15)}</span>
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (this.radicals.length > 0) {
            radicalsHtml = `
                <div class="word-detail-radicals">
                    <p class="no-radicals-found">No direct radical match found for this character.</p>
                </div>
            `;
        }
        
        modalContent.innerHTML = `
            <div class="word-detail">
                <div class="word-detail-chinese">${wordData.Word}</div>
                <div class="word-detail-pinyin">${wordData.Pinyin || wordData.Reading || wordData.Romanization || ''}</div>
                <div class="word-detail-english">${wordData.English || ''}</div>
                
                <div class="word-detail-info">
                    <div class="detail-item">
                        <span class="detail-label">Category:</span>
                        <span class="detail-value">${wordData.Category || ''}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">POS:</span>
                        <span class="detail-value">${wordData.POS || ''}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Role:</span>
                        <span class="detail-value">${wordData.Role || ''}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Common Usage:</span>
                        <span class="detail-value">${wordData.Common_Usage || ''}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Example:</span>
                        <span class="detail-value">${wordData.Example_Phrase || ''}</span>
                    </div>
                </div>
                
                ${radicalsHtml}
                
                <div class="word-detail-audio">
                    <button class="audio-btn" onclick="this.closest('.modal').querySelector('.close').click(); setTimeout(() => document.querySelector('[data-audio=\\'${wordData.Word}\\']').click(), 100)">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                        </svg>
                        Play Audio
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
        
        // Close modal when clicking outside or on close button
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => modal.style.display = 'none';
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    /**
     * Find radicals in a word/character
     * Uses word-radical mappings from vocabulary CSVs
     * Looks up meanings dynamically from radicals.csv via radicalLoader
     * @param {string} word - The word to analyze
     * @returns {Array} Array of radical objects with meanings from radicals.csv
     */
    findRadicalsInWord(word) {
        const found = [];
        
        // Check if we have a word-radical mapping from vocabulary CSV
        if (this.wordRadicals && this.wordRadicals[word]) {
            const mapping = this.wordRadicals[word];
            
            // For each radical from vocabulary CSV, look up meaning from radicals.csv
            mapping.radicals.forEach((radical) => {
                let radicalInfo = null;
                
                // Use radicalLoader for proper variant matching if available
                if (this.radicalLoader) {
                    radicalInfo = this.radicalLoader.getRadicalInfo(radical, this.currentLanguage);
                }
                
                // Fallback to direct array lookup if radicalLoader not available
                if (!radicalInfo && this.radicals && this.radicals.length > 0) {
                    radicalInfo = this.radicals.find(r => r.Radical === radical);
                }
                
                found.push({
                    Radical: radical,
                    Pinyin: radicalInfo?.Pinyin || '',
                    Meaning: radicalInfo?.Meaning || '',
                    Description: radicalInfo?.Description || '',
                    fromRadicalsCSV: !!radicalInfo
                });
            });
            return found;
        }
        
        // STRICT MODE: Only use explicit mapping from vocabulary CSVs
        // If no mapping exists, return empty array.
        return found;
    }

    /**
     * Truncate text with ellipsis
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    clearSelection() {
        this.selectedWords = {};
        this.container.querySelectorAll('.word-btn.selected').forEach(btn => {
            btn.classList.remove('selected');
        });
        this.onWordSelect({}, this.categoryOrder);
    }
    
    getSelectedWords() {
        return this.selectedWords;
    }
}