export class SentenceDisplay {
    constructor(chineseId, pinyinId, englishId, currentLevelCallback = null, categoryConfig = {}) {
        this.chineseEl = document.getElementById(chineseId);
        this.pinyinEl = document.getElementById(pinyinId);
        this.englishEl = document.getElementById(englishId);
        this.currentLevelCallback = currentLevelCallback;
        this.currentLanguageCallback = null; // Will be set via setter
        this.categoryConfig = categoryConfig;
        this.emptyMessage = 'Select words from the columns below to build a sentence';
        this.currentSentenceWords = []; // Store words for playback on demand
    }

    /**
     * Set the current language callback
     * @param {Function} callback - Callback to get current language
     */
    setCurrentLanguageCallback(callback) {
        this.currentLanguageCallback = callback;
    }

    /**
     * Set the category configuration for coloring words
     * @param {Object} categoryConfig - Category configuration object
     */
    setCategoryConfig(categoryConfig) {
        this.categoryConfig = categoryConfig;
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

    async update(selectedWords, categoryOrder = []) {
        // Use category order to build sentence in correct order
        const orderedCategories = categoryOrder.length > 0 
            ? categoryOrder 
            : Object.keys(selectedWords);
        const chineseSpans = [];
        const pinyinWords = [];
        const englishWords = [];
        const wordObjects = [];
        
        orderedCategories.forEach(cat => {
            if (selectedWords[cat]) {
                const word = selectedWords[cat];
                const config = this.categoryConfig[cat] || {};
                const bgColor = config.color || '#007AFF';
                const textColor = this.getContrastColor(bgColor);
                
                // Create colored span for Chinese word
                const span = document.createElement('span');
                span.textContent = word.Word;
                span.style.backgroundColor = bgColor;
                span.style.color = textColor;
                span.style.padding = '2px 6px';
                span.style.borderRadius = '4px';
                span.style.margin = '0 1px';
                span.style.display = 'inline-block';
                span.style.fontWeight = 'bold';
                chineseSpans.push(span);
                
                wordObjects.push(word);
                if (word.Pinyin) {
                    pinyinWords.push(word.Pinyin);
                }
                if (word.English) {
                    englishWords.push(word.English);
                }
            }
        });
        if (chineseSpans.length === 0) {
            this.chineseEl.textContent = this.emptyMessage;
            this.chineseEl.style.opacity = '0.5';
            this.pinyinEl.textContent = '';
            this.englishEl.textContent = '';
            this.currentSentenceWords = [];
        } else {
            // Clear and add colored spans
            this.chineseEl.innerHTML = '';
            chineseSpans.forEach(span => {
                this.chineseEl.appendChild(span);
            });
            this.chineseEl.style.opacity = '1';
            this.pinyinEl.textContent = pinyinWords.join(' ');
            this.englishEl.textContent = englishWords.join(' ');
            // Store words for on-demand playback
            this.currentSentenceWords = wordObjects;
        }
    }

    async playSentenceAudioSequence(wordObjects) {
        if (!wordObjects || wordObjects.length === 0) return;
        
        const audioBlobs = [];
        // Get current level from callback or use word's level
        const currentLevel = this.currentLevelCallback ? this.currentLevelCallback() : 'basic';
        
        for (const wordObj of wordObjects) {
            const word = wordObj.Word;
            const wordLevel = wordObj.Level ? wordObj.Level.toString().toLowerCase() : null;
            const current = currentLevel ? currentLevel.toString().toLowerCase() : null;

            // Build candidate levels in order of preference
            const candidates = [];
            if (wordLevel && wordLevel !== 'all' && wordLevel !== 'all_levels') candidates.push(wordLevel);
            if (current && current !== 'all' && current !== 'all_levels') candidates.push(current);
            ['basic', 'intermediate', 'advanced'].forEach(l => { if (!candidates.includes(l)) candidates.push(l); });

            if (window.audioCache) {
                let found = false;
                // Get current language from callback or default to chinese
                const currentLanguage = this.currentLanguageCallback ? this.currentLanguageCallback() : 'chinese';
                
                for (const lvl of candidates) {
                    // Try language-aware path first, then legacy path
                    const langPath = `assets/audio/${currentLanguage}/${lvl}/${word}.mp3`;
                    const legacyPath = `assets/audio/${lvl}/${word}.mp3`;
                    
                    for (const path of [langPath, legacyPath]) {
                        try {
                            const blob = await window.audioCache.getAudio(path, lvl, true);
                            if (blob) { audioBlobs.push(blob); found = true; break; }
                        } catch (e) {
                            // try next path
                        }
                    }
                    if (found) break;
                }
                if (!found) {
                    console.warn('[SentenceDisplay] Audio not found for:', word, 'in any level candidates');
                }
            }
        }
        
        // Play audios in sequence
        for (const blob of audioBlobs) {
            if (!blob) continue; // Skip null blobs
            
            try {
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                
                await new Promise((resolve) => {
                    audio.onended = () => {
                        try {
                            URL.revokeObjectURL(url);
                        } catch (e) {}
                        resolve();
                    };
                    
                    audio.onerror = (error) => {
                        console.warn('[SentenceDisplay] Audio playback error:', error);
                        try {
                            URL.revokeObjectURL(url);
                        } catch (e) {}
                        resolve();
                    };
                    
                    // Add small delay between words
                    setTimeout(() => {
                        audio.play().catch((err) => {
                            console.warn('[SentenceDisplay] Failed to play audio:', err);
                            resolve();
                        });
                    }, 100);
                });
            } catch (error) {
                console.warn('[SentenceDisplay] Error playing audio blob:', error);
            }
        }
    }
    
    /**
     * Play the complete sentence audio
     */
    async playSentence() {
        if (this.currentSentenceWords.length === 0) {
            console.warn('[SentenceDisplay] No sentence to play');
            return;
        }
        await this.playSentenceAudioSequence(this.currentSentenceWords);
    }

    clear() {
        this.chineseEl.textContent = this.emptyMessage;
        this.chineseEl.style.opacity = '0.5';
        this.pinyinEl.textContent = '';
        this.englishEl.textContent = '';
        this.currentSentenceWords = [];
    }
    
    setEmptyMessage(message) {
        this.emptyMessage = message;
    }
}