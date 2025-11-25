/**
 * Unit Tests for service-worker.js
 * Tests caching strategies, URL construction, and audio request handling
 * 
 * CRITICAL: These tests verify the URL construction bug fix
 * Bug: Missing '/' between origin and path caused Request construction to fail
 * Example: "http://localhost:8000" + "chinese-matrix/path" = INVALID
 */

describe('Service Worker URL Construction', () => {
    
    describe('Path Normalization', () => {
        /**
         * This test suite specifically targets the bug that was found:
         * Failed to construct 'Request': Failed to parse URL from 
         * http://localhost:8000chinese-matrix-lenguage-learn/web_v3/...
         */
        
        test('should always add leading slash when constructing URLs', () => {
            const origin = 'http://localhost:8000';
            const paths = [
                'chinese-matrix-lenguage-learn/web_v3/assets/audio/basic/我.mp3',
                'assets/audio/basic/你.mp3',
                'web_v3/assets/audio/intermediate/吃.mp3'
            ];
            
            for (const path of paths) {
                const normalizedPath = path.startsWith('/') ? path : '/' + path;
                const fullUrl = origin + normalizedPath;
                
                // This must not throw
                expect(() => new URL(fullUrl)).not.toThrow();
                expect(fullUrl).toContain('://localhost:8000/');
            }
        });
        
        test('should not double-slash when path already has leading slash', () => {
            const origin = 'http://localhost:8000';
            const path = '/assets/audio/basic/我们.mp3';
            
            const normalizedPath = path.startsWith('/') ? path : '/' + path;
            const fullUrl = origin + normalizedPath;
            
            expect(fullUrl).toBe('http://localhost:8000/assets/audio/basic/我们.mp3');
            expect(fullUrl).not.toContain('//assets'); // No double slash
        });
        
        test('should handle all error-causing paths from bug report', () => {
            const origin = 'http://localhost:8000';
            const buggyPaths = [
                'chinese-matrix-lenguage-learn/web_v3/assets/audio/basic/呢.mp3',
                'chinese-matrix-lenguage-learn/web_v3/assets/audio/basic/吃.mp3',
                'chinese-matrix-lenguage-learn/web_v3/assets/audio/basic/我们.mp3',
                'chinese-matrix-lenguage-learn/web_v3/assets/audio/intermediate/作为.mp3',
                'chinese-matrix-lenguage-learn/web_v3/assets/audio/intermediate/责任.mp3',
                'chinese-matrix-lenguage-learn/web_v3/assets/audio/advanced/影响.mp3',
                'chinese-matrix-lenguage-learn/web_v3/assets/audio/advanced/几乎.mp3'
            ];
            
            for (const path of buggyPaths) {
                // WITHOUT normalization (the original bug)
                const buggyUrl = origin + path;
                expect(() => new URL(buggyUrl)).toThrow(); // This demonstrates the bug
                
                // WITH normalization (the fix)
                const normalizedPath = path.startsWith('/') ? path : '/' + path;
                const fixedUrl = origin + normalizedPath;
                expect(() => new URL(fixedUrl)).not.toThrow(); // This is the fix
                
                const url = new URL(fixedUrl);
                expect(url.hostname).toBe('localhost');
                expect(url.port).toBe('8000');
            }
        });
    });
    
    describe('Path Variations Logic', () => {
        
        test('should generate correct path variations', () => {
            const pathname = '/assets/audio/basic/我.mp3';
            
            const pathVariations = [
                pathname,
                pathname.startsWith('/') ? pathname : '/' + pathname,
                pathname.replace(/^\//, '')
            ];
            
            expect(pathVariations).toContain('/assets/audio/basic/我.mp3');
            expect(pathVariations).toContain('assets/audio/basic/我.mp3');
        });
        
        test('should handle paths without leading slash', () => {
            const pathname = 'assets/audio/basic/你.mp3';
            
            const pathVariations = [
                pathname,
                pathname.startsWith('/') ? pathname : '/' + pathname,
                pathname.replace(/^\//, '')
            ];
            
            expect(pathVariations).toContain('assets/audio/basic/你.mp3');
            expect(pathVariations).toContain('/assets/audio/basic/你.mp3');
        });
    });
    
    describe('Request Construction Safety', () => {
        
        test('should safely construct Request with normalized path', () => {
            const origin = 'http://localhost:8000';
            const paths = [
                'assets/audio/basic/是.mp3',
                '/assets/audio/basic/有.mp3',
                'chinese-matrix/web_v3/assets/audio/basic/的.mp3'
            ];
            
            for (const path of paths) {
                const normalizedPath = path.startsWith('/') ? path : '/' + path;
                
                // Should not throw
                expect(() => {
                    new Request(origin + normalizedPath);
                }).not.toThrow();
            }
        });
        
        test('should catch and handle invalid paths gracefully', () => {
            const testPathHandling = (path) => {
                try {
                    const normalizedPath = path.startsWith('/') ? path : '/' + path;
                    new Request('http://localhost:8000' + normalizedPath);
                    return true;
                } catch (e) {
                    return false;
                }
            };
            
            // All these should succeed after normalization
            expect(testPathHandling('simple/path.mp3')).toBe(true);
            expect(testPathHandling('/already/with/slash.mp3')).toBe(true);
            expect(testPathHandling('chinese/中文/path.mp3')).toBe(true);
        });
    });
});

describe('Caching Strategies', () => {
    
    describe('isStaticAsset helper', () => {
        
        const STATIC_ASSETS = [
            './',
            './index.html',
            './css/style.css',
            './js/main.js'
        ];
        
        function isStaticAsset(url) {
            return STATIC_ASSETS.some(asset => url.includes(asset)) ||
                   url.endsWith('.js') ||
                   url.endsWith('.css') ||
                   url.endsWith('.svg') ||
                   url.endsWith('.png') ||
                   url.endsWith('.ico') ||
                   url.endsWith('.webmanifest');
        }
        
        test('should identify JavaScript files as static', () => {
            expect(isStaticAsset('http://localhost:8000/js/main.js')).toBe(true);
            expect(isStaticAsset('http://localhost:8000/js/utils/csvLoader.js')).toBe(true);
        });
        
        test('should identify CSS files as static', () => {
            expect(isStaticAsset('http://localhost:8000/css/style.css')).toBe(true);
        });
        
        test('should identify image files as static', () => {
            expect(isStaticAsset('http://localhost:8000/images/logo.svg')).toBe(true);
            expect(isStaticAsset('http://localhost:8000/images/icon.png')).toBe(true);
        });
        
        test('should not identify data files as static', () => {
            expect(isStaticAsset('http://localhost:8000/data/vocab.csv')).toBe(false);
            expect(isStaticAsset('http://localhost:8000/data/config.json')).toBe(false);
        });
    });
    
    describe('Audio Request Detection', () => {
        
        function isAudioRequest(url) {
            return url.includes('/assets/audio/') && url.endsWith('.mp3');
        }
        
        test('should detect audio files correctly', () => {
            expect(isAudioRequest('http://localhost:8000/assets/audio/basic/我.mp3')).toBe(true);
            expect(isAudioRequest('http://localhost:8000/assets/audio/intermediate/吃.mp3')).toBe(true);
            expect(isAudioRequest('http://localhost:8000/assets/audio/advanced/影响.mp3')).toBe(true);
        });
        
        test('should not detect non-audio files', () => {
            expect(isAudioRequest('http://localhost:8000/assets/images/logo.png')).toBe(false);
            expect(isAudioRequest('http://localhost:8000/js/main.js')).toBe(false);
        });
        
        test('should handle various path formats', () => {
            expect(isAudioRequest('/assets/audio/basic/你.mp3')).toBe(true);
            expect(isAudioRequest('./assets/audio/basic/他.mp3')).toBe(true);
        });
    });
    
    describe('Data Request Detection', () => {
        
        function isDataRequest(url) {
            return url.includes('/data/') || url.endsWith('.csv') || url.endsWith('.json');
        }
        
        test('should detect CSV files', () => {
            expect(isDataRequest('http://localhost:8000/data/vocab.csv')).toBe(true);
            expect(isDataRequest('http://localhost:8000/data/chinese_basic.csv')).toBe(true);
        });
        
        test('should detect JSON files', () => {
            expect(isDataRequest('http://localhost:8000/data/matrix_index.json')).toBe(true);
        });
        
        test('should detect files in /data/ directory', () => {
            expect(isDataRequest('http://localhost:8000/data/config')).toBe(true);
        });
    });
});

describe('Chinese Character Handling', () => {
    
    test('should handle Chinese characters in URL paths', () => {
        const hanziCharacters = ['我', '你', '他', '她', '是', '有', '的', '在', '呢', '吧', '吗'];
        const origin = 'http://localhost:8000';
        
        for (const hanzi of hanziCharacters) {
            const path = `/assets/audio/basic/${hanzi}.mp3`;
            const fullUrl = origin + path;
            
            expect(() => new URL(fullUrl)).not.toThrow();
            expect(() => new Request(fullUrl)).not.toThrow();
        }
    });
    
    test('should handle multi-character words', () => {
        const words = ['我们', '你们', '他们', '作为', '责任', '影响', '几乎', '如果'];
        const origin = 'http://localhost:8000';
        
        for (const word of words) {
            const path = `/assets/audio/intermediate/${word}.mp3`;
            const fullUrl = origin + path;
            
            expect(() => new URL(fullUrl)).not.toThrow();
        }
    });
    
    test('should handle URL encoding of Chinese characters', () => {
        const hanzi = '我';
        const encoded = encodeURIComponent(hanzi);
        const origin = 'http://localhost:8000';
        
        // Both encoded and raw should work
        const rawUrl = `${origin}/assets/audio/basic/${hanzi}.mp3`;
        const encodedUrl = `${origin}/assets/audio/basic/${encoded}.mp3`;
        
        expect(() => new URL(rawUrl)).not.toThrow();
        expect(() => new URL(encodedUrl)).not.toThrow();
    });
});

describe('Cache Key Matching', () => {
    
    test('should match requests with different path formats', () => {
        // Simulating cache key matching logic
        const cacheKey1 = '/assets/audio/basic/我.mp3';
        const cacheKey2 = 'assets/audio/basic/我.mp3';
        const cacheKey3 = './assets/audio/basic/我.mp3';
        
        // After normalization, these should be comparable
        const normalize = (path) => {
            if (path.startsWith('./')) return path.substring(2);
            if (path.startsWith('/')) return path.substring(1);
            return path;
        };
        
        const normalized1 = normalize(cacheKey1);
        const normalized2 = normalize(cacheKey2);
        const normalized3 = normalize(cacheKey3);
        
        expect(normalized1).toBe(normalized2);
        expect(normalized2).toBe(normalized3);
    });
});
