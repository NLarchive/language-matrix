/**
 * Audio Cache Utility
 * Manages audio file caching and playback with fallback strategies
 */

const AUDIO_CACHE_NAME = 'janulus-audio-v1';
const CACHE_TIMEOUT = 30000; // 30 seconds timeout for network requests

class AudioCache {
    constructor() {
        this.audioCache = {};
        this.cacheDb = null;
        this.dbReady = this.initDB();
        this.currentLevel = 'basic'; // Track current matrix level
        this.currentLanguage = 'chinese'; // Track current language for audio path resolution
    }

    /**
     * Set the current level to prevent cross-level searches
     * @param {string} level - The current matrix level (basic, intermediate, advanced)
     */
    setCurrentLevel(level) {
        this.currentLevel = level;
    }

    /**
     * Set the current language folder used for audio path resolution
     * @param {string} language e.g. 'chinese', 'Japanese'
     */
    setCurrentLanguage(language) {
        if (typeof language === 'string' && language.trim() !== '') {
            this.currentLanguage = language;
        }
    }

    /**
     * Convert an arbitrary string into a filename-safe representation.
     * Replaces slashes and other unsafe filesystem characters with '-' and trims.
     * @param {string} value
     * @returns {string}
     */
    sanitizeFilename(value) {
        if (!value || typeof value !== 'string') return '';
        // Replace forward/back slashes and other common illegal filename characters with underscore
        // Use underscore to match the filename normalization used by offline assets generation
        return value.replace(/[\/\\:*?"<>|]/g, '_').trim();
    }

    /**
     * Initialize IndexedDB for storing audio metadata
     */
    initDB() {
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open('JanulosAudio', 1);

                request.onerror = () => {
                    console.warn('[AudioCache] IndexedDB init error:', request.error);
                    resolve(); // Continue without IndexedDB
                };
                
                request.onsuccess = () => {
                    this.cacheDb = request.result;
                    resolve();
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('audioFiles')) {
                        const store = db.createObjectStore('audioFiles', { keyPath: 'path' });
                        store.createIndex('level', 'level', { unique: false });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                };
            } catch (error) {
                console.warn('[AudioCache] IndexedDB not available:', error);
                resolve(); // Gracefully continue without IndexedDB
            }
        });
    }

    /**
     * Get audio file from cache or network
     * @param {string} audioPath - Path to audio file (e.g., 'assets/audio/basic/我.mp3')
     * @param {string} level - Category level (basic, intermediate, advanced)
     * @param {boolean} strictLevel - If true, only search in specified level (no fallback)
     * @returns {Promise<Blob>} Audio blob or null if not found
     */
    async getAudio(audioPath, level = 'basic', strictLevel = false) {
        try {
            // Normalize path to be relative (remove leading slash if present)
            const normalizedPath = audioPath.startsWith('/') ? audioPath.substring(1) : audioPath;

            // Wait for IndexedDB to be ready
            await this.dbReady;

            // Try IndexedDB first
            const cached = await this.getFromIndexedDB(normalizedPath);
            if (cached) {
                return cached;
            }

            // Build candidate paths to try. Prefer language-aware structure then fall back to legacy structure.
            const basename = normalizedPath.split('/').pop();
            const levelSegment = level || this.currentLevel || 'basic';
            // If the basename was percent encoded (eg: %EC%9D%80%2F%EB%8A%94) try to decode for sanitization
            let decodedBase = basename;
            try { decodedBase = decodeURIComponent(basename); } catch (e) { /* leave as-is */ }
            const sanitizedBase = this.sanitizeFilename(decodedBase);
            const sanitizedEncoded = encodeURIComponent(sanitizedBase);
            const candidates = [];

            // If caller provided a fully qualified path (already contains language), preserve it
            if (normalizedPath.includes(`/assets/audio/${this.currentLanguage}/`)) {
                // If caller passed an already-language-scoped path, try both the passed path and a sanitized sibling path
                candidates.push(normalizedPath);
                const sanitizedNormalized = normalizedPath.replace(basename, sanitizedEncoded);
                if (!candidates.includes(sanitizedNormalized)) candidates.push(sanitizedNormalized);
            } else {
                // prefer sanitized raw (unicode) then encoded forms of the filename so both forms are tried
                candidates.push(`assets/audio/${this.currentLanguage}/${levelSegment}/${sanitizedBase}`);
                candidates.push(`assets/audio/${this.currentLanguage}/${levelSegment}/${sanitizedEncoded}`);
                // prefer sanitized legacy raw and encoded variants
                candidates.push(`assets/audio/${levelSegment}/${sanitizedBase}`);
                candidates.push(`assets/audio/${levelSegment}/${sanitizedEncoded}`);
                // fallback to the original basename (encoded or not) for compatibility
                candidates.push(`assets/audio/${this.currentLanguage}/${levelSegment}/${basename}`);
                candidates.push(`assets/audio/${levelSegment}/${basename}`);
                // then original path (in case caller supplied something else)
                if (!candidates.includes(normalizedPath)) candidates.push(normalizedPath);
            }

            // Try service worker cache across candidates (strictLevel will short-circuit to first candidate only)
            let cacheAudio = null;
            for (const candidate of candidates) {
                cacheAudio = await this.getFromCache(candidate);
                if (cacheAudio) break;
                // Also try with leading slash
                cacheAudio = await this.getFromCache('/' + candidate);
                if (cacheAudio) break;
                if (strictLevel) break; // only check the preferred path when strict
            }
            
            // If not found and not strict level, try with leading slash
            if (!cacheAudio && !strictLevel) {
                cacheAudio = await this.getFromCache('/' + normalizedPath);
            }
            
            if (cacheAudio) {
                // Note: Skipping IndexedDB save for cached audio to avoid potential serialization issues
                // await this.saveToIndexedDB(normalizedPath, cacheAudio, level);
                // Also record under a sanitized path key so later lookups for sanitized filenames succeed
                try {
                    const sanitizedKey = normalizedPath.replace(basename, sanitizedEncoded);
                    if (sanitizedKey !== normalizedPath) {
                        // await this.saveToIndexedDB(sanitizedKey, cacheAudio, level);
                    }
                } catch (e) { /* ignore */ }
                return cacheAudio;
            }

            // Fetch from network with timeout - only from the specified path
            // Try network fetch across candidate paths (do not attempt every variation in strict mode)
            let blob = null;
            for (const candidate of candidates) {
                try {
                    blob = await this.fetchWithTimeout(candidate, CACHE_TIMEOUT);
                    if (blob) {
                        // cache the found path
                        await Promise.all([
                            this.saveToCache(candidate, blob),
                            this.saveToIndexedDB(candidate, blob, level)
                        ]);
                        // Also cache under sanitized normalized key (so future lookups using sanitized names will hit)
                        try {
                            const sanitizedCandidateKey = candidate.replace(basename, sanitizedEncoded);
                            if (sanitizedCandidateKey !== candidate) {
                                await this.saveToCache(sanitizedCandidateKey, blob).catch(() => {});
                                await this.saveToIndexedDB(sanitizedCandidateKey, blob, level).catch(() => {});
                            }
                        } catch (e) { /* ignore */ }
                        break;
                    }
                } catch (e) {
                    // try next candidate
                    if (strictLevel) break;
                    continue;
                }
            }
            
            // Cache the audio
            // If blob found above it was already cached; if not, attempt to store under normalizedPath
            if (blob) {
                await Promise.all([
                    this.saveToCache(normalizedPath, blob),
                    this.saveToIndexedDB(normalizedPath, blob, level)
                ]).catch(() => {});
                // Also record the sanitized form for later convenience
                try {
                    const sanitizedKey = normalizedPath.replace(basename, sanitizedEncoded);
                    if (sanitizedKey !== normalizedPath) {
                        await Promise.all([
                            this.saveToCache(sanitizedKey, blob).catch(() => {}),
                            this.saveToIndexedDB(sanitizedKey, blob, level).catch(() => {})
                        ]);
                    }
                } catch (e) { /* no-op */ }
            }

            return blob;

        } catch (error) {
            console.warn('[AudioCache] Error getting audio:', audioPath, 'Level:', level, error.message);
            // Return null instead of throwing - let the UI handle missing audio gracefully
            return null;
        }
    }

    /**
     * Get audio from IndexedDB
     */
    getFromIndexedDB(path) {
        return new Promise((resolve) => {
            if (!this.cacheDb) {
                resolve(null);
                return;
            }

            try {
                const transaction = this.cacheDb.transaction(['audioFiles'], 'readonly');
                const store = transaction.objectStore('audioFiles');
                const request = store.get(path);

                request.onerror = () => {
                    console.warn('[AudioCache] IndexedDB get error for:', path);
                    resolve(null);
                };

                request.onsuccess = () => {
                    const result = request.result;
                    if (result && result.blob) {
                        // Check if cached file is not too old (7 days)
                        const maxAge = 7 * 24 * 60 * 60 * 1000;
                        if (Date.now() - result.timestamp < maxAge) {
                            resolve(result.blob);
                        } else {
                            // Remove old cache entry
                            this.removeFromIndexedDB(path);
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                };
            } catch (error) {
                console.warn('[AudioCache] IndexedDB transaction error:', error);
                resolve(null);
            }
        });
    }

    /**
     * Save audio to IndexedDB
     */
    saveToIndexedDB(path, blob, level = 'basic') {
        return new Promise((resolve) => {
            if (!this.cacheDb) {
                resolve();
                return;
            }

            if (!blob || !(blob instanceof Blob)) {
                resolve();
                return;
            }

            try {
                const transaction = this.cacheDb.transaction(['audioFiles'], 'readwrite');
                const store = transaction.objectStore('audioFiles');
                const request = store.put({
                    path,
                    blob,
                    level,
                    timestamp: Date.now(),
                    size: blob.size
                });

                request.onerror = () => {
                    console.warn('[AudioCache] IndexedDB put error for:', path);
                    resolve();
                };
                
                request.onsuccess = () => resolve();
            } catch (error) {
                console.warn('[AudioCache] IndexedDB save error:', error);
                resolve();
            }
        });
    }

    /**
     * Remove from IndexedDB
     */
    removeFromIndexedDB(path) {
        return new Promise((resolve) => {
            if (!this.cacheDb) {
                resolve();
                return;
            }

            try {
                const transaction = this.cacheDb.transaction(['audioFiles'], 'readwrite');
                const store = transaction.objectStore('audioFiles');
                store.delete(path);
                resolve();
            } catch (error) {
                console.warn('[AudioCache] IndexedDB delete error:', error);
                resolve();
            }
        });
    }

    /**
     * Get audio from Cache API with flexible path matching
     */
    async getFromCache(audioPath) {
        try {
            const cache = await caches.open(AUDIO_CACHE_NAME);
            
            // Try exact match first
            let response = await cache.match(audioPath);
            
            // If not found, try with leading slash variations
            if (!response) {
                const pathWithSlash = audioPath.startsWith('/') ? audioPath : '/' + audioPath;
                response = await cache.match(pathWithSlash);
            }
            
            // If still not found, try without leading slash
            if (!response && audioPath.startsWith('/')) {
                response = await cache.match(audioPath.substring(1));
            }
            
            if (response && response.status === 200) {
                const blob = await response.blob();
                return blob;
            }
            return null;
        } catch (error) {
            console.warn('[AudioCache] Cache API error:', error.message);
            return null;
        }
    }

    /**
     * Save audio to Cache API
     */
    async saveToCache(audioPath, blob) {
        try {
            const cache = await caches.open(AUDIO_CACHE_NAME);
            const response = new Response(blob, {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'public, max-age=2592000' // 30 days
                }
            });
            await cache.put(audioPath, response);
        } catch (error) {
            console.warn('[AudioCache] Failed to save to Cache API:', error.message);
        }
    }

    /**
     * Fetch with timeout
     */
    fetchWithTimeout(url, timeout) {
        return Promise.race([
            fetch(url).then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.blob();
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Fetch timeout after ${timeout}ms`)), timeout)
            )
        ]);
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        try {
            const cache = await caches.open(AUDIO_CACHE_NAME);
            const keys = await cache.keys();
            let totalSize = 0;

            for (const request of keys) {
                const response = await cache.match(request);
                if (response) {
                    const blob = await response.blob();
                    totalSize += blob.size;
                }
            }

            return {
                fileCount: keys.length,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                totalSizeBytes: totalSize
            };
        } catch (error) {
            console.error('[AudioCache] Error getting cache stats:', error.message);
            return { fileCount: 0, totalSizeMB: 0, totalSizeBytes: 0 };
        }
    }

    /**
     * Clear audio cache
     */
    async clearAudioCache() {
        try {
            await caches.delete(AUDIO_CACHE_NAME);
            // Clear IndexedDB
            if (this.cacheDb) {
                const transaction = this.cacheDb.transaction(['audioFiles'], 'readwrite');
                const store = transaction.objectStore('audioFiles');
                store.clear();
            }
            return true;
        } catch (error) {
            console.error('[AudioCache] Error clearing cache:', error.message);
            return false;
        }
    }

    /**
     * Preload audio files for a specific level
     * @param {string} level - 'basic', 'intermediate', or 'advanced'
     * @param {Array<string>} hanziList - List of Hanzi to preload
     */
    async preloadLevel(level, hanziList) {
        console.log(`[AudioCache] Preloading ${level} level audio (${hanziList.length} files)...`);
        const results = [];

        for (const hanzi of hanziList) {
            try {
                const sanitized = this.sanitizeFilename(hanzi);
                const encoded = encodeURIComponent(sanitized);
                const audioPath = `assets/audio/${this.currentLanguage}/${level}/${encoded}.mp3`;
                await this.getAudio(audioPath, level);
                results.push({ hanzi, success: true });
            } catch (error) {
                console.warn(`[AudioCache] Failed to preload ${hanzi}:`, error.message);
                results.push({ hanzi, success: false, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        return results;
    }

    /**
     * Preload all vocabulary audio for a language and level by reading the vocabulary CSV
     * @param {string} language - Language folder (e.g., 'chinese')
     * @param {string} level - Level ('basic', 'intermediate', 'advanced')
     * @returns {Promise<Object>} Results with success/failure counts
     */
    async preloadVocabularyAudio(language, level) {
        console.log(`[AudioCache] Starting vocabulary audio preload for ${language}/${level}...`);
        
        try {
            // Fetch the vocabulary CSV for this level
            const csvPath = `data/languages/${language}/${level}.csv`;
            const response = await fetch(csvPath);
            
            if (!response.ok) {
                console.warn(`[AudioCache] Could not fetch vocabulary file: ${csvPath}`);
                return { success: 0, failed: 0, total: 0 };
            }
            
            const csvText = await response.text();
            const lines = csvText.trim().split('\n');
            
            if (lines.length < 2) {
                return { success: 0, failed: 0, total: 0 };
            }
            
            // Parse CSV header to find Word column using quote-aware parsing
            const headers = this._parseCSVLine(lines[0]);
            const wordIndex = headers.indexOf('Word');
            
            if (wordIndex === -1) {
                console.warn('[AudioCache] No Word column found in vocabulary CSV');
                return { success: 0, failed: 0, total: 0 };
            }
            
            // Extract all words from the CSV using quote-aware parsing
            const words = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = this._parseCSVLine(lines[i]);
                if (cols[wordIndex]) {
                    words.push(cols[wordIndex]);
                }
            }
            
            console.log(`[AudioCache] Found ${words.length} words to preload for ${level}`);
            
            // Preload all audio files in parallel batches (5 at a time)
            const batchSize = 5;
            let successCount = 0;
            let failedCount = 0;
            
            for (let i = 0; i < words.length; i += batchSize) {
                const batch = words.slice(i, i + batchSize);
                const promises = batch.map(async (word) => {
                    try {
                        // Sanitize word for use in file path (replace illegal chars then encode)
                        const sanitizedWord = this.sanitizeFilename(word);
                        const encodedWord = encodeURIComponent(sanitizedWord);
                        const audioPath = `assets/audio/${language}/${level}/${encodedWord}.mp3`;
                        await this.getAudio(audioPath, level);
                        return { word, success: true };
                    } catch (error) {
                        return { word, success: false, error: error.message };
                    }
                });
                
                const results = await Promise.all(promises);
                results.forEach(r => {
                    if (r.success) successCount++;
                    else failedCount++;
                });
            }
            
            console.log(`[AudioCache] Preload complete for ${level}: ${successCount} success, ${failedCount} failed`);
            return { success: successCount, failed: failedCount, total: words.length };
            
        } catch (error) {
            console.error(`[AudioCache] Error preloading vocabulary audio:`, error);
            return { success: 0, failed: 0, total: 0, error: error.message };
        }
    }

    /**
     * Parse a CSV line handling quoted fields with commas (RFC 4180 compliant)
     * @private
     * @param {string} line - CSV line to parse
     * @returns {Array<string>} Array of field values
     */
    _parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            
            if (inQuotes) {
                if (char === '"') {
                    // Check for escaped quote (double quote)
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        current += '"';
                        i += 2;
                        continue;
                    } else {
                        // End of quoted field
                        inQuotes = false;
                        i++;
                        continue;
                    }
                } else {
                    current += char;
                    i++;
                }
            } else {
                if (char === '"') {
                    // Start of quoted field
                    inQuotes = true;
                    i++;
                } else if (char === ',') {
                    // Field separator
                    result.push(current.trim());
                    current = '';
                    i++;
                } else {
                    current += char;
                    i++;
                }
            }
        }
        
        // Push the last field
        result.push(current.trim());
        
        return result;
    }
}

// Create singleton instance
const audioCache = new AudioCache();

export { audioCache, AudioCache };
