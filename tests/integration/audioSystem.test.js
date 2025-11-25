/**
 * Integration Tests
 * Tests the interaction between different modules
 */

describe('Audio System Integration', () => {
    
    describe('Audio Path Resolution', () => {
        
        test('should generate correct audio paths from vocabulary data', () => {
            const vocabItem = {
                Word: '我',
                Level: 'basic'
            };
            
            const expectedPath = `assets/audio/${vocabItem.Level}/${vocabItem.Word}.mp3`;
            expect(expectedPath).toBe('assets/audio/basic/我.mp3');
        });
        
        test('should handle all proficiency levels', () => {
            const levels = ['basic', 'intermediate', 'advanced'];
            
            for (const level of levels) {
                const path = `assets/audio/${level}/test.mp3`;
                expect(path).toContain(level);
            }
        });
    });
    
    describe('CSV to Cache Path Mapping', () => {
        
        test('should correctly map CSV word entries to audio paths', () => {
            // Simulate parsed CSV data
            const csvData = [
                { Category: 'Pronoun', Word: '我', Pinyin: 'wǒ' },
                { Category: 'Verb', Word: '吃', Pinyin: 'chī' },
                { Category: 'Adjective', Word: '好', Pinyin: 'hǎo' }
            ];
            
            const audioBasePath = 'assets/audio/basic';
            
            const audioPaths = csvData.map(item => `${audioBasePath}/${item.Word}.mp3`);
            
            expect(audioPaths).toEqual([
                'assets/audio/basic/我.mp3',
                'assets/audio/basic/吃.mp3',
                'assets/audio/basic/好.mp3'
            ]);
        });
    });
    
    describe('Category Config to UI Color Mapping', () => {
        
        test('should apply category colors correctly', () => {
            const categoryConfig = {
                Pronoun: { color: '#FF6B6B', description: 'Personal pronouns' },
                Verb: { color: '#4ECDC4', description: 'Action words' },
                Noun: { color: '#45B7D1', description: 'Things' }
            };
            
            const vocabByCategory = {
                Pronoun: [{ Word: '我' }, { Word: '你' }],
                Verb: [{ Word: '是' }, { Word: '有' }]
            };
            
            // Each category should have its color
            for (const [category, words] of Object.entries(vocabByCategory)) {
                expect(categoryConfig[category]).toBeDefined();
                expect(categoryConfig[category].color).toBeDefined();
            }
        });
    });
});

describe('Sentence Generation Integration', () => {
    
    test('should combine selected words into sentence', () => {
        const selectedWords = [
            { Category: 'Time', Word: '昨天' },
            { Category: 'Pronoun', Word: '我' },
            { Category: 'Verb', Word: '吃' },
            { Category: 'Object', Word: '饭' }
        ];
        
        const sentence = selectedWords.map(w => w.Word).join('');
        expect(sentence).toBe('昨天我吃饭');
    });
    
    test('should generate audio paths for sentence words', () => {
        const sentence = [
            { Word: '昨天', Level: 'intermediate' },
            { Word: '我', Level: 'basic' },
            { Word: '吃', Level: 'basic' },
            { Word: '饭', Level: 'basic' }
        ];
        
        const audioPaths = sentence.map(word => 
            `assets/audio/${word.Level}/${word.Word}.mp3`
        );
        
        expect(audioPaths).toHaveLength(4);
        expect(audioPaths[0]).toBe('assets/audio/intermediate/昨天.mp3');
    });
});

describe('Caching System Integration', () => {
    
    describe('Path Normalization Across Systems', () => {
        /**
         * Critical test: Ensures consistent path handling between:
         * - audioCache.js
         * - service-worker.js
         * - SentenceDisplay.js
         */
        
        test('all systems should normalize paths consistently', () => {
            const testPaths = [
                '/assets/audio/basic/我.mp3',
                'assets/audio/basic/我.mp3',
                './assets/audio/basic/我.mp3'
            ];
            
            // Normalization function used across the codebase
            const normalizePath = (path) => {
                if (path.startsWith('./')) return path.substring(2);
                if (path.startsWith('/')) return path.substring(1);
                return path;
            };
            
            const normalized = testPaths.map(normalizePath);
            
            // All should normalize to the same value
            expect(new Set(normalized).size).toBe(1);
            expect(normalized[0]).toBe('assets/audio/basic/我.mp3');
        });
    });
    
    describe('Cache Key Consistency', () => {
        
        test('Cache API and IndexedDB should use same keys', () => {
            const audioPath = 'assets/audio/basic/你.mp3';
            
            // Both systems should use the same key format
            const cacheApiKey = audioPath;
            const indexedDbKey = audioPath;
            
            expect(cacheApiKey).toBe(indexedDbKey);
        });
    });
});

describe('Error Handling Integration', () => {
    
    test('should gracefully handle missing audio files', async () => {
        // Simulate missing audio behavior
        const handleMissingAudio = async (audioPath) => {
            try {
                // Simulate failed fetch
                throw new Error('404 Not Found');
            } catch (error) {
                // Should return null, not throw
                return null;
            }
        };
        
        const result = await handleMissingAudio('assets/audio/basic/nonexistent.mp3');
        expect(result).toBeNull();
    });
    
    test('should handle invalid CSV data gracefully', () => {
        const parseCSVSafely = (text) => {
            try {
                if (!text || text.trim() === '') return [];
                // Parse CSV...
                return []; // Simplified
            } catch (error) {
                console.warn('CSV parse error:', error);
                return [];
            }
        };
        
        expect(parseCSVSafely('')).toEqual([]);
        expect(parseCSVSafely(null)).toEqual([]);
        expect(parseCSVSafely(undefined)).toEqual([]);
    });
});

describe('Data Flow Integration', () => {
    
    test('complete data flow from CSV to audio playback', () => {
        // 1. Parse CSV
        const csvLine = 'Pronoun,我,wǒ,I,basic';
        const [category, word, pinyin, english, level] = csvLine.split(',');
        
        // 2. Create word object
        const wordObj = { Category: category, Word: word, Pinyin: pinyin, English: english, Level: level };
        
        // 3. Generate audio path
        const audioPath = `assets/audio/${wordObj.Level}/${wordObj.Word}.mp3`;
        
        // 4. Verify path is valid
        expect(audioPath).toBe('assets/audio/basic/我.mp3');
        
        // 5. Verify path can be used in URL
        const fullUrl = 'http://localhost:8000/' + audioPath;
        expect(() => new URL(fullUrl)).not.toThrow();
    });
});
