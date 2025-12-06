/**
 * Word Composer Component
 * Interactive drag-and-drop game for building Chinese words from radicals
 * Players drag radicals onto a canvas to form words, getting audio feedback on success
 */

import { audioCache } from '../utils/audioCache.js';

export class WordComposer {
    constructor(containerId, radicalLoader) {
        this.container = document.getElementById(containerId);
        this.radicalLoader = radicalLoader;
        this.currentWord = null; // Current word to compose
        this.placedRadicals = []; // Radicals placed on canvas
        this.availableRadicals = []; // Radicals available for dragging
        this.currentLanguage = 'chinese';
        this.currentLevel = 'basic';
        this.composableWords = [];
        this.wordIndex = 0;
        this.score = 0;
        this.onWordComplete = null; // Callback when word is completed
        this.isWordComplete = false; // Track if current word is completed
        this.lastCompletedWord = null; // Store last completed word for audio replay
        this.highlightActive = false; // Track if radical hints are highlighted
    }

    /**
     * Initialize the composer with language and level
     * @param {string} language - Language path (e.g., 'chinese')
     * @param {string} level - Level filter ('basic', 'intermediate', 'advanced', 'all')
     */
    async init(language = 'chinese', level = 'basic') {
        this.currentLanguage = language;
        this.currentLevel = level;
        
        // Load word-radical mappings from level vocabularies
        await this.radicalLoader.buildWordRadicalsFromLevels(language);
        await this.radicalLoader.loadRadicals(language);
        
        // Get composable words for this level (filters by vocabulary CSV)
        this.composableWords = await this.radicalLoader.getComposableWords(language, level);
        
        if (this.composableWords.length === 0) {
            console.warn('[WordComposer] No composable words found for', language, level);
            this.render();
            return;
        }
        
        // Shuffle words for variety
        this.shuffleWords();
        this.wordIndex = 0;
        this.score = 0;
        
        this.loadNextWord();
        this.render();
    }

    /**
     * Shuffle the composable words array
     */
    shuffleWords() {
        for (let i = this.composableWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.composableWords[i], this.composableWords[j]] = 
                [this.composableWords[j], this.composableWords[i]];
        }
    }

    /**
     * Load the next word to compose
     */
    loadNextWord() {
        if (this.wordIndex >= this.composableWords.length) {
            this.wordIndex = 0;
            this.shuffleWords();
        }
        
        this.currentWord = this.composableWords[this.wordIndex];
        this.wordIndex++;
        
        // Reset state for new word
        this.placedRadicals = [];
        this.isWordComplete = false;
        this.lastCompletedWord = null;
        this.highlightActive = false;
        
        // Clear any highlights from previous word
        this.clearRadicalHighlights();
        
        // Create available radicals (shuffled)
        this.availableRadicals = [...this.currentWord.radicals];
        this.shuffleArray(this.availableRadicals);
        
        // Add some distractor radicals (optional, for increased difficulty)
        // this.addDistractorRadicals();
    }

    /**
     * Shuffle an array in place
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Render the composer interface
     */
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = '';
        
        // Create main composer layout
        const composerEl = document.createElement('div');
        composerEl.className = 'word-composer';
        
        // Header with instructions and score
        const header = document.createElement('div');
        header.className = 'composer-header';
        header.innerHTML = `
            <div class="composer-title">
                <h3>🎯 Word Composer</h3>
                <p>Drag radicals from the reference library below to form the word</p>
            </div>
            <div class="composer-stats">
                <span class="score-display">Score: <strong>${this.score}</strong></span>
                <span class="progress-display">${this.wordIndex}/${this.composableWords.length}</span>
            </div>
        `;
        composerEl.appendChild(header);
        
        if (!this.currentWord) {
            const noWords = document.createElement('div');
            noWords.className = 'no-words-message';
            noWords.innerHTML = `
                <p>No composable words available for this level.</p>
                <p>Try selecting a different level or "All Levels".</p>
            `;
            composerEl.appendChild(noWords);
            this.container.appendChild(composerEl);
            return;
        }
        
        // Hint section (shows the target word to form)
        const hintSection = document.createElement('div');
        hintSection.className = 'composer-hint';
        hintSection.innerHTML = `
            <div class="hint-label">Form this word:</div>
            <div class="hint-content">
                <span class="hint-word">${this.currentWord.word}</span>
                <span class="hint-radicals">(${this.currentWord.radicals.length} radicals)</span>
            </div>
            <button class="btn btn-hint" id="highlight-radicals-btn" title="Highlight the radicals needed for this word">
                💡 Show Hints
            </button>
        `;
        composerEl.appendChild(hintSection);
        
        // Drop zone canvas
        const canvasSection = document.createElement('div');
        canvasSection.className = 'composer-canvas-section';
        
        const canvas = document.createElement('div');
        canvas.className = 'composer-canvas';
        canvas.id = 'composer-drop-zone';
        
        // Create slots for each radical position
        for (let i = 0; i < this.currentWord.radicals.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'radical-slot';
            slot.dataset.index = i;
            
            if (this.placedRadicals[i]) {
                slot.classList.add('filled');
                slot.innerHTML = `<span class="placed-radical">${this.placedRadicals[i]}</span>`;
            } else {
                slot.innerHTML = `<span class="slot-placeholder">${i + 1}</span>`;
            }
            
            canvas.appendChild(slot);
        }
        
        canvasSection.appendChild(canvas);
        
        // Clear and check buttons - different buttons based on state
        const canvasControls = document.createElement('div');
        canvasControls.className = 'canvas-controls';
        
        if (this.isWordComplete) {
            // Show replay and next buttons after successful completion
            canvasControls.innerHTML = `
                <button class="btn btn-replay" id="replay-audio-btn">🔊 Replay Audio</button>
                <button class="btn btn-next" id="next-word-btn">➡️ Next Word</button>
            `;
        } else {
            // Show normal controls during composition
            canvasControls.innerHTML = `
                <button class="btn btn-clear" id="clear-canvas-btn">🔄 Clear</button>
                <button class="btn btn-check" id="check-word-btn">✓ Check</button>
                <button class="btn btn-skip" id="skip-word-btn">⏭ Skip</button>
            `;
        }
        canvasSection.appendChild(canvasControls);
        
        composerEl.appendChild(canvasSection);
        
        // Note: Radicals are draggable from the radical-reference-section below
        // No separate palette needed - users drag from the reference cards
        
        // Result message area
        const resultArea = document.createElement('div');
        resultArea.className = 'composer-result';
        resultArea.id = 'composer-result';
        composerEl.appendChild(resultArea);
        
        this.container.appendChild(composerEl);
        
        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Count occurrences of a value in an array
     */
    countOccurrences(arr, val) {
        return arr.filter(x => x === val).length;
    }

    /**
     * Set up drag and drop event listeners
     */
    setupEventListeners() {
        // Draggable radicals from reference section cards
        const draggables = document.querySelectorAll('.radical-card');
        draggables.forEach(card => {
            card.addEventListener('dragstart', (e) => this.handleDragStart(e));
            card.addEventListener('dragend', (e) => this.handleDragEnd(e));
            
            // Touch support
            card.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
            card.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            card.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        });
        
        // Drop zones (slots) - only if word is not complete
        if (!this.isWordComplete) {
            const slots = this.container.querySelectorAll('.radical-slot:not(.filled)');
            slots.forEach(slot => {
                slot.addEventListener('dragover', (e) => this.handleDragOver(e));
                slot.addEventListener('dragenter', (e) => this.handleDragEnter(e));
                slot.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                slot.addEventListener('drop', (e) => this.handleDrop(e));
            });
        }
        
        // Control buttons - composition phase
        const clearBtn = this.container.querySelector('#clear-canvas-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearCanvas());
        }
        
        const checkBtn = this.container.querySelector('#check-word-btn');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => this.checkWord());
        }
        
        const skipBtn = this.container.querySelector('#skip-word-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skipWord());
        }
        
        // Highlight radicals hint button
        const hintBtn = this.container.querySelector('#highlight-radicals-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.toggleRadicalHighlights());
        }
        
        // Control buttons - completion phase
        const replayBtn = this.container.querySelector('#replay-audio-btn');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => this.replayWordAudio());
        }
        
        const nextBtn = this.container.querySelector('#next-word-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.goToNextWord());
        }
    }

    // Drag and Drop handlers
    handleDragStart(e) {
        const card = e.target.closest('.radical-card');
        if (!card) return;
        
        card.classList.add('dragging');
        const radicalChar = card.dataset.radical;
        e.dataTransfer.setData('text/plain', radicalChar);
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        const card = e.target.closest('.radical-card');
        if (card) card.classList.remove('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.target.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.target.classList.remove('drag-over');
        
        const radical = e.dataTransfer.getData('text/plain');
        const slotIndex = parseInt(e.target.dataset.index);
        
        if (radical && !isNaN(slotIndex)) {
            this.placeRadical(radical, slotIndex);
        }
    }

    // Touch handlers for mobile support
    handleTouchStart(e) {
        const touch = e.touches[0];
        const card = e.target.closest('.radical-card');
        
        if (card) {
            e.preventDefault();
            card.classList.add('touch-dragging');
            this.touchDragData = {
                element: card,
                radical: card.dataset.radical,
                startX: touch.clientX,
                startY: touch.clientY
            };
            
            // Create ghost element
            const ghost = card.cloneNode(true);
            ghost.classList.add('touch-ghost');
            ghost.style.position = 'fixed';
            ghost.style.left = `${touch.clientX - 30}px`;
            ghost.style.top = `${touch.clientY - 30}px`;
            ghost.style.pointerEvents = 'none';
            ghost.style.zIndex = '10000';
            document.body.appendChild(ghost);
            this.touchDragData.ghost = ghost;
        }
    }

    handleTouchMove(e) {
        if (!this.touchDragData) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        if (this.touchDragData.ghost) {
            this.touchDragData.ghost.style.left = `${touch.clientX - 30}px`;
            this.touchDragData.ghost.style.top = `${touch.clientY - 30}px`;
        }
        
        // Check if over a slot
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const slot = element?.closest('.radical-slot:not(.filled)');
        
        // Remove highlight from all slots
        this.container.querySelectorAll('.radical-slot').forEach(s => {
            s.classList.remove('drag-over');
        });
        
        if (slot) {
            slot.classList.add('drag-over');
        }
    }

    handleTouchEnd(e) {
        if (!this.touchDragData) return;
        
        // Find the slot under the touch point
        const touch = e.changedTouches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const slot = element?.closest('.radical-slot:not(.filled)');
        
        if (slot) {
            const slotIndex = parseInt(slot.dataset.index);
            this.placeRadical(this.touchDragData.radical, slotIndex);
        }
        
        // Cleanup
        if (this.touchDragData.ghost) {
            this.touchDragData.ghost.remove();
        }
        this.touchDragData.element.classList.remove('touch-dragging');
        this.container.querySelectorAll('.radical-slot').forEach(s => {
            s.classList.remove('drag-over');
        });
        
        this.touchDragData = null;
    }

    /**
     * Place a radical in a slot
     */
    placeRadical(radical, slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.currentWord.radicals.length) {
            this.placedRadicals[slotIndex] = radical;
            this.render();
            
            // Check if all slots are filled
            if (this.placedRadicals.filter(r => r).length === this.currentWord.radicals.length) {
                // Auto-check after a short delay
                setTimeout(() => this.checkWord(), 300);
            }
        }
    }

    /**
     * Clear all placed radicals
     */
    clearCanvas() {
        this.placedRadicals = [];
        this.render();
    }

    /**
     * Check if the composed word is correct
     */
    async checkWord() {
        const resultArea = this.container.querySelector('#composer-result');
        if (!resultArea) return;
        
        // Check if composition matches
        const isCorrect = this.placedRadicals.join('+') === this.currentWord.radicals.join('+');
        
        if (isCorrect) {
            this.score++;
            this.isWordComplete = true;
            this.lastCompletedWord = this.currentWord;
            
            // Build verification UI with word details
            const verificationHtml = await this.buildVerificationUI(this.currentWord);
            
            resultArea.className = 'composer-result success';
            resultArea.innerHTML = verificationHtml;
            
            // Play audio feedback
            await this.playWordAudio(this.currentWord.word);
            
            // Trigger callback
            if (this.onWordComplete) {
                this.onWordComplete(this.currentWord, true);
            }
            
            // Re-render to show completion buttons (Replay Audio, Next Word)
            // But preserve the result message
            this.render();
            
            // Restore the verification panel after re-render
            const newResultArea = this.container.querySelector('#composer-result');
            if (newResultArea && this.lastCompletedWord) {
                const newVerificationHtml = await this.buildVerificationUI(this.lastCompletedWord, true);
                newResultArea.className = 'composer-result success';
                newResultArea.innerHTML = newVerificationHtml;
            }
            
        } else {
            resultArea.className = 'composer-result error';
            resultArea.innerHTML = `
                <div class="result-icon">✗</div>
                <div class="result-text">
                    <span class="result-message">Not quite right. Try again!</span>
                </div>
            `;
            
            // Clear after a moment to try again
            setTimeout(() => {
                resultArea.innerHTML = '';
                resultArea.className = 'composer-result';
            }, 1500);
        }
    }

    /**
     * Build verification UI showing word details after correct composition
     * @param {Object} wordData - The completed word data
     * @param {boolean} showNextHint - Whether to show "Next Word" hint
     * @returns {Promise<string>} HTML for verification panel
     */
    async buildVerificationUI(wordData, showNextHint = false) {
        // Get component meanings from radicals
        const componentDetails = [];
        for (const radical of wordData.radicals) {
            const radicalInfo = this.radicalLoader.getRadicalInfo(radical, this.currentLanguage);
            if (radicalInfo) {
                componentDetails.push({
                    radical,
                    meaning: radicalInfo.Meaning || radicalInfo.Description || '',
                    reading: radicalInfo.Reading || ''
                });
            } else {
                componentDetails.push({ radical, meaning: '', reading: '' });
            }
        }
        
        const componentsHtml = componentDetails.map(c => `
            <div class="verification-component">
                <span class="component-char">${c.radical}</span>
                ${c.reading ? `<span class="component-reading">${c.reading}</span>` : ''}
                ${c.meaning ? `<span class="component-meaning">${c.meaning}</span>` : ''}
            </div>
        `).join('<span class="component-plus">+</span>');
        
        const levelBadges = wordData.levels 
            ? Array.from(wordData.levels).map(l => `<span class="level-badge ${l}">${l}</span>`).join('')
            : '';
        
        return `
            <div class="verification-panel">
                <div class="verification-header">
                    <span class="result-icon">✓</span>
                    <span class="verification-title">Word Verified!</span>
                </div>
                <div class="verification-word">
                    <span class="word-main">${wordData.word}</span>
                    ${levelBadges}
                </div>
                <div class="verification-components">
                    <span class="components-label">Components:</span>
                    <div class="components-breakdown">
                        ${componentsHtml}
                    </div>
                </div>
                <div class="verification-score">
                    <span class="score-icon">🏆</span>
                    <span class="score-text">Score: ${this.score}</span>
                </div>
                ${showNextHint ? '<div class="verification-hint">Press "Next Word" to continue</div>' : ''}
            </div>
        `;
    }

    /**
     * Replay the audio for the last completed word
     */
    async replayWordAudio() {
        if (this.lastCompletedWord) {
            await this.playWordAudio(this.lastCompletedWord.word);
        }
    }

    /**
     * Go to the next word (manual advancement)
     */
    goToNextWord() {
        this.clearRadicalHighlights();
        this.loadNextWord();
        this.render();
    }

    /**
     * Toggle highlighting of radicals needed for current word
     */
    toggleRadicalHighlights() {
        if (this.highlightActive) {
            this.clearRadicalHighlights();
            this.highlightActive = false;
            
            // Update button text
            const hintBtn = this.container.querySelector('#highlight-radicals-btn');
            if (hintBtn) {
                hintBtn.textContent = '💡 Show Hints';
                hintBtn.classList.remove('active');
            }
        } else {
            this.highlightRadicals();
            this.highlightActive = true;
            
            // Update button text
            const hintBtn = this.container.querySelector('#highlight-radicals-btn');
            if (hintBtn) {
                hintBtn.textContent = '💡 Hide Hints';
                hintBtn.classList.add('active');
            }
        }
    }

    /**
     * Highlight radical cards that are needed for the current word
     */
    highlightRadicals() {
        if (!this.currentWord) return;
        
        const neededRadicals = new Set(this.currentWord.radicals);
        const allCards = document.querySelectorAll('.radical-card');
        
        allCards.forEach(card => {
            const radicalChar = card.dataset.radical;
            if (neededRadicals.has(radicalChar)) {
                card.classList.add('highlighted-hint');
            }
        });
        
        console.log(`[WordComposer] Highlighted ${neededRadicals.size} radicals for word: ${this.currentWord.word}`);
    }

    /**
     * Clear all radical highlights
     */
    clearRadicalHighlights() {
        const allCards = document.querySelectorAll('.radical-card');
        allCards.forEach(card => {
            card.classList.remove('highlighted-hint');
        });
    }

    /**
     * Skip to the next word
     */
    skipWord() {
        this.loadNextWord();
        this.render();
    }

    /**
     * Play audio for a word
     * Uses the word's level from the level vocabulary data to find the correct audio file
     */
    async playWordAudio(word) {
        try {
            // Use the word's own level from the data (from level vocabularies)
            // This ensures we look in the correct folder (basic/intermediate/advanced)
            const wordLevel = this.currentWord?.level || this.currentLevel;
            // Prefer audio folder name registered on audioCache (preserves folder casing like 'Korean')
            const audioFolder = (window.audioCache && window.audioCache.currentLanguage) ? window.audioCache.currentLanguage : this.currentLanguage;
            const safeName = (window.audioCache && typeof window.audioCache.sanitizeFilename === 'function')
                ? window.audioCache.sanitizeFilename(word)
                : String(word);
            const encodedName = encodeURIComponent(safeName);
            const audioPath = `assets/audio/${audioFolder}/${wordLevel}/${encodedName}.mp3`;
            
            console.log('[WordComposer] Playing audio:', audioPath, 'level:', wordLevel);
            
            // If we don't have a single level (all_levels or missing), try searching across level candidates
            let audioBlob = null;
            const levelCandidates = (wordLevel && wordLevel !== 'all' && wordLevel !== 'all_levels')
                ? [wordLevel]
                : ['basic', 'intermediate', 'advanced'];

            for (const lvl of levelCandidates) {
                const candidatePath = `assets/audio/${audioFolder}/${lvl}/${encodedName}.mp3`;
                try {
                    audioBlob = await audioCache.getAudio(candidatePath, lvl, true);
                    if (audioBlob) break;
                } catch (e) {
                    // continue to next level
                }
            }
            
            if (audioBlob) {
                const url = URL.createObjectURL(audioBlob);
                const audio = new Audio();
                
                // Set preload to ensure full buffering before play
                audio.preload = 'auto';

                await new Promise((resolve, reject) => {
                    const cleanup = () => {
                        URL.revokeObjectURL(url);
                        audio.onended = null;
                        audio.onerror = null;
                        audio.oncanplaythrough = null;
                        audio.onloadeddata = null;
                    };
                    
                    audio.onended = () => {
                        cleanup();
                        resolve();
                    };
                    
                    audio.onerror = (err) => {
                        cleanup();
                        console.warn('[WordComposer] Audio playback error:', err);
                        reject(err);
                    };

                    // Wait for audio to be fully buffered before playing
                    // Use both canplaythrough and loadeddata for maximum compatibility
                    let ready = false;
                    const playWhenReady = () => {
                        if (ready) return;
                        ready = true;
                        // Longer delay (200ms) to ensure audio context is fully initialized
                        // This prevents the beginning of the audio from being clipped
                        setTimeout(() => {
                            audio.play().catch((e) => {
                                cleanup();
                                reject(e);
                            });
                        }, 200);
                    };
                    
                    audio.oncanplaythrough = playWhenReady;
                    audio.onloadeddata = playWhenReady;
                    
                    // Set source after handlers are attached
                    audio.src = url;
                    audio.load();
                });
            } else {
                console.warn('[WordComposer] No audio blob found for:', audioPath);
            }
        } catch (error) {
            console.warn('[WordComposer] Could not play audio for:', word, error);
        }
    }

    /**
     * Set the level and reload words
     */
    async setLevel(level) {
        this.currentLevel = level;
        await this.init(this.currentLanguage, level);
    }

    /**
     * Get current score
     */
    getScore() {
        return this.score;
    }

    /**
     * Reset the game
     */
    reset() {
        this.score = 0;
        this.wordIndex = 0;
        this.shuffleWords();
        this.loadNextWord();
        this.render();
    }
}
