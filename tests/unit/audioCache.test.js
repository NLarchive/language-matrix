/**
 * Unit Tests for audioCache.js
 * Tests 3-layer caching system, path normalization, and audio retrieval
 */

// Import fake-indexeddb before our module
import 'fake-indexeddb/auto';

// Mock the caches API
const mockCache = {
    match: jest.fn(),
    put: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
    delete: jest.fn()
};

global.caches = {
    open: jest.fn().mockResolvedValue(mockCache),
    delete: jest.fn().mockResolvedValue(true)
};

// Mock fetch
global.fetch = jest.fn();

// Mock Response
global.Response = class {
    constructor(body, init = {}) {
        this.body = body;
        this.headers = init.headers || {};
        this.ok = true;
        this.status = 200;
    }
    blob() {
        return Promise.resolve(this.body);
    }
};

describe('AudioCache', () => {
    let audioCache;
    let AudioCache;
    
    beforeEach(async () => {
        // Clear all mocks
        jest.clearAllMocks();
        mockCache.match.mockReset();
        mockCache.put.mockReset();
        mockCache.keys.mockReset().mockResolvedValue([]);
        global.fetch.mockReset();
        
        // Fresh import for each test
        jest.resetModules();
        const module = await import('../../js/utils/audioCache.js');
        AudioCache = module.AudioCache;
        audioCache = new AudioCache();
        
        // Wait for IndexedDB to initialize
        await audioCache.dbReady;
    });
    
    describe('Path Normalization', () => {
        
        test('should normalize paths with leading slash', async () => {
            const mockBlob = new Blob(['audio data'], { type: 'audio/mpeg' });
            mockCache.match.mockResolvedValue({
                status: 200,
                blob: () => Promise.resolve(mockBlob)
            });
            
            const result = await audioCache.getAudio('/assets/audio/basic/我.mp3', 'basic');
            
            // Should have tried to match with normalized path (without leading slash)
            expect(mockCache.match).toHaveBeenCalled();
        });
        
        test('should try multiple path variations when looking in cache', async () => {
            // First call returns null, second returns the audio
            const mockBlob = new Blob(['audio data'], { type: 'audio/mpeg' });
            mockCache.match
                .mockResolvedValueOnce(null)  // First try (exact path)
                .mockResolvedValueOnce({      // Second try (with slash)
                    status: 200,
                    blob: () => Promise.resolve(mockBlob)
                });
            
            const result = await audioCache.getFromCache('assets/audio/basic/我.mp3');
            
            expect(mockCache.match).toHaveBeenCalledTimes(2);
        });
        
        test('should handle paths without leading slash', async () => {
            const mockBlob = new Blob(['audio data'], { type: 'audio/mpeg' });
            mockCache.match.mockResolvedValue({
                status: 200,
                blob: () => Promise.resolve(mockBlob)
            });
            
            const result = await audioCache.getAudio('assets/audio/basic/你.mp3', 'basic');
            
            expect(mockCache.match).toHaveBeenCalled();
        });
    });
    
    describe('getAudio', () => {
        
        test('should return blob from cache when available', async () => {
            const mockBlob = new Blob(['test audio'], { type: 'audio/mpeg' });
            mockCache.match.mockResolvedValue({
                status: 200,
                blob: () => Promise.resolve(mockBlob)
            });
            
            const result = await audioCache.getAudio('assets/audio/basic/我.mp3');
            
            expect(result).toBeInstanceOf(Blob);
        });
        
        test('should fetch from network when not in cache', async () => {
            const mockBlob = new Blob(['network audio'], { type: 'audio/mpeg' });
            mockCache.match.mockResolvedValue(null);
            global.fetch.mockResolvedValue({
                ok: true,
                blob: () => Promise.resolve(mockBlob)
            });
            
            const result = await audioCache.getAudio('assets/audio/basic/他.mp3');
            
            expect(fetch).toHaveBeenCalled();
            expect(result).toBeInstanceOf(Blob);
        });
        
        test('should return null on network error instead of throwing', async () => {
            mockCache.match.mockResolvedValue(null);
            global.fetch.mockRejectedValue(new Error('Network error'));
            
            const result = await audioCache.getAudio('assets/audio/basic/她.mp3');
            
            expect(result).toBeNull();
        });
        
        test('should handle Chinese characters in paths correctly', async () => {
            const mockBlob = new Blob(['audio'], { type: 'audio/mpeg' });
            mockCache.match.mockResolvedValue({
                status: 200,
                blob: () => Promise.resolve(mockBlob)
            });
            
            // Test various Chinese characters
            const testCases = ['我们', '作为', '责任', '影响', '几乎', '呢'];
            
            for (const hanzi of testCases) {
                const result = await audioCache.getAudio(`assets/audio/basic/${hanzi}.mp3`);
                expect(result).not.toBeNull();
            }
        });
    });
    
    describe('Cache Storage', () => {
        
        test('should save to Cache API after fetching', async () => {
            const mockBlob = new Blob(['audio'], { type: 'audio/mpeg' });
            mockCache.match.mockResolvedValue(null);
            global.fetch.mockResolvedValue({
                ok: true,
                blob: () => Promise.resolve(mockBlob)
            });
            
            await audioCache.getAudio('assets/audio/basic/是.mp3');
            
            expect(mockCache.put).toHaveBeenCalled();
        });
        
        test('saveToCache should create Response with correct headers', async () => {
            const mockBlob = new Blob(['audio'], { type: 'audio/mpeg' });
            
            await audioCache.saveToCache('assets/audio/basic/有.mp3', mockBlob);
            
            expect(mockCache.put).toHaveBeenCalledWith(
                'assets/audio/basic/有.mp3',
                expect.any(Object)
            );
        });
    });
    
    describe('IndexedDB Operations', () => {
        
        test('should save and retrieve from IndexedDB', async () => {
            const mockBlob = new Blob(['test audio'], { type: 'audio/mpeg' });
            const path = 'assets/audio/basic/在.mp3';
            
            // Save to IndexedDB
            await audioCache.saveToIndexedDB(path, mockBlob, 'basic');
            
            // Retrieve from IndexedDB
            const result = await audioCache.getFromIndexedDB(path);
            
            expect(result).not.toBeNull();
        });
        
        test('should return null for non-existent IndexedDB entries', async () => {
            const result = await audioCache.getFromIndexedDB('nonexistent/path.mp3');
            expect(result).toBeNull();
        });
        
        test('should remove old entries from IndexedDB', async () => {
            const mockBlob = new Blob(['old audio'], { type: 'audio/mpeg' });
            const path = 'assets/audio/basic/old.mp3';
            
            // Manually save with old timestamp
            if (audioCache.cacheDb) {
                const transaction = audioCache.cacheDb.transaction(['audioFiles'], 'readwrite');
                const store = transaction.objectStore('audioFiles');
                await new Promise((resolve) => {
                    const request = store.put({
                        path,
                        blob: mockBlob,
                        level: 'basic',
                        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days ago
                        size: mockBlob.size
                    });
                    request.onsuccess = resolve;
                });
            }
            
            // Should return null for expired entry
            const result = await audioCache.getFromIndexedDB(path);
            expect(result).toBeNull();
        });
    });
    
    describe('getCacheStats', () => {
        
        test('should return cache statistics', async () => {
            mockCache.keys.mockResolvedValue([
                new Request('assets/audio/basic/我.mp3'),
                new Request('assets/audio/basic/你.mp3')
            ]);
            mockCache.match.mockResolvedValue({
                blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' }))
            });
            
            const stats = await audioCache.getCacheStats();
            
            expect(stats).toHaveProperty('fileCount');
            expect(stats).toHaveProperty('totalSizeMB');
            expect(stats).toHaveProperty('totalSizeBytes');
            expect(stats.fileCount).toBe(2);
        });
        
        test('should return zero stats on error', async () => {
            mockCache.keys.mockRejectedValue(new Error('Cache error'));
            
            const stats = await audioCache.getCacheStats();
            
            expect(stats.fileCount).toBe(0);
            expect(stats.totalSizeMB).toBe(0);
        });
    });
    
    describe('clearAudioCache', () => {
        
        test('should clear both Cache API and IndexedDB', async () => {
            const result = await audioCache.clearAudioCache();
            
            expect(global.caches.delete).toHaveBeenCalledWith('janulus-audio-v1');
            expect(result).toBe(true);
        });
        
        test('should return false on error', async () => {
            global.caches.delete.mockRejectedValueOnce(new Error('Delete error'));
            
            const result = await audioCache.clearAudioCache();
            
            expect(result).toBe(false);
        });
    });
    
    describe('fetchWithTimeout', () => {
        
        test('should resolve when fetch completes before timeout', async () => {
            const mockBlob = new Blob(['audio'], { type: 'audio/mpeg' });
            global.fetch.mockResolvedValue({
                ok: true,
                blob: () => Promise.resolve(mockBlob)
            });
            
            const result = await audioCache.fetchWithTimeout('test.mp3', 5000);
            
            expect(result).toBeInstanceOf(Blob);
        });
        
        test('should reject when fetch times out', async () => {
            global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
            
            await expect(
                audioCache.fetchWithTimeout('test.mp3', 100)
            ).rejects.toThrow('Fetch timeout');
        });
        
        test('should reject on HTTP error', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 404
            });
            
            await expect(
                audioCache.fetchWithTimeout('notfound.mp3', 5000)
            ).rejects.toThrow('HTTP 404');
        });
    });
    
    describe('preloadLevel', () => {
        
        test('should preload all audio files for a level', async () => {
            const mockBlob = new Blob(['audio'], { type: 'audio/mpeg' });
            mockCache.match.mockResolvedValue({
                status: 200,
                blob: () => Promise.resolve(mockBlob)
            });
            
            const hanziList = ['我', '你', '他'];
            const results = await audioCache.preloadLevel('basic', hanziList);
            
            expect(results).toHaveLength(3);
            expect(results.every(r => r.success)).toBe(true);
        });
        
        test('should track failed preloads', async () => {
            mockCache.match.mockResolvedValue(null);
            global.fetch.mockRejectedValue(new Error('Network error'));
            
            const hanziList = ['我'];
            const results = await audioCache.preloadLevel('basic', hanziList);
            
            expect(results[0].success).toBe(false);
            expect(results[0].error).toBeDefined();
        });
    });
});

describe('URL Construction Bug Prevention', () => {
    /**
     * These tests specifically verify that the URL construction bug
     * (missing '/' between origin and path) cannot happen
     */
    
    test('path normalization should always produce valid URLs', () => {
        const testPaths = [
            'assets/audio/basic/我.mp3',
            '/assets/audio/basic/你.mp3',
            'chinese-matrix-lenguage-learn/web_v3/assets/audio/basic/他.mp3',
            '/chinese-matrix-lenguage-learn/web_v3/assets/audio/basic/她.mp3'
        ];
        
        const origin = 'http://localhost:8000';
        
        for (const path of testPaths) {
            const normalizedPath = path.startsWith('/') ? path : '/' + path;
            const fullUrl = origin + normalizedPath;
            
            // This should not throw
            expect(() => new URL(fullUrl)).not.toThrow();
            
            // The URL should be valid
            const url = new URL(fullUrl);
            expect(url.origin).toBe(origin);
            expect(url.pathname).toBe(normalizedPath);
        }
    });
    
    test('path without leading slash should be normalized correctly', () => {
        const path = 'chinese-matrix-lenguage-learn/web_v3/assets/audio/basic/呢.mp3';
        const origin = 'http://localhost:8000';
        
        // Without normalization (the bug)
        const buggyUrl = origin + path;
        expect(buggyUrl).toBe('http://localhost:8000chinese-matrix-lenguage-learn/web_v3/assets/audio/basic/呢.mp3');
        expect(() => new URL(buggyUrl)).toThrow(); // This is the bug!
        
        // With normalization (the fix)
        const normalizedPath = path.startsWith('/') ? path : '/' + path;
        const fixedUrl = origin + normalizedPath;
        expect(fixedUrl).toBe('http://localhost:8000/chinese-matrix-lenguage-learn/web_v3/assets/audio/basic/呢.mp3');
        expect(() => new URL(fixedUrl)).not.toThrow(); // This is correct
    });
});
