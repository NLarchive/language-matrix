/**
 * Cache Management Utilities
 * Provides UI and functions for managing local caches
 */

import { audioCache } from './audioCache.js';

class CacheManager {
    /**
     * Show cache statistics in console
     */
    static async logCacheStats() {
        try {
            const stats = await audioCache.getCacheStats();
            console.log('[CacheManager] Cache Statistics:');
            console.log(`  Files cached: ${stats.fileCount}`);
            console.log(`  Total size: ${stats.totalSizeMB} MB`);
            console.log(`  Raw size: ${stats.totalSizeBytes.toLocaleString()} bytes`);
        } catch (error) {
            console.error('[CacheManager] Error getting stats:', error);
        }
    }

    /**
     * Clear all caches
     */
    static async clearAllCache() {
        if (!confirm('Are you sure you want to clear all cached data? This will free up storage space but audio files will need to be downloaded again.')) {
            return false;
        }

        try {
            // Use service worker message if available
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                const channel = new MessageChannel();
                const promise = new Promise((resolve) => {
                    channel.port1.onmessage = (event) => {
                        resolve(event.data.success);
                    };
                });

                navigator.serviceWorker.controller.postMessage(
                    { type: 'CLEAR_ALL_CACHE' },
                    [channel.port2]
                );

                const success = await promise;
                if (success) {
                    console.info('[CacheManager] All cache cleared via service worker');
                    alert('Cache cleared successfully!');
                    return true;
                }
            }

            // Fallback: clear using Cache API directly
            await audioCache.clearAudioCache();
            await caches.delete('janulus-matrix-v1');
            console.info('[CacheManager] All cache cleared');
            alert('Cache cleared successfully!');
            return true;

        } catch (error) {
            console.error('[CacheManager] Error clearing cache:', error);
            alert('Failed to clear cache. Please try again.');
            return false;
        }
    }

    /**
     * Clear only audio cache
     */
    static async clearAudioCache() {
        if (!confirm('Clear audio cache? Audio files will need to be downloaded again.')) {
            return false;
        }

        try {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                const channel = new MessageChannel();
                const promise = new Promise((resolve) => {
                    channel.port1.onmessage = (event) => {
                        resolve(event.data.success);
                    };
                });

                navigator.serviceWorker.controller.postMessage(
                    { type: 'CLEAR_AUDIO_CACHE' },
                    [channel.port2]
                );

                await promise;
            }

            await audioCache.clearAudioCache();
            console.info('[CacheManager] Audio cache cleared');
            alert('Audio cache cleared successfully!');
            return true;

        } catch (error) {
            console.error('[CacheManager] Error clearing audio cache:', error);
            alert('Failed to clear audio cache.');
            return false;
        }
    }

    /**
     * Preload audio for a specific level
     */
    static async preloadLevel(level, hanziList) {
        console.info(`[CacheManager] Starting preload for ${level} level...`);
        
        // Show progress
        const showProgress = () => {
            const currentTime = new Date().toLocaleTimeString();
            console.info(`[CacheManager] Preload in progress... ${currentTime}`);
        };

        const progressInterval = setInterval(showProgress, 5000);

        try {
            const results = await audioCache.preloadLevel(level, hanziList);
            clearInterval(progressInterval);
            
            const successCount = results.filter(r => r.success).length;
            console.info(`[CacheManager] Preload completed: ${successCount}/${hanziList.length} files`);
            
            return {
                success: true,
                level,
                totalFiles: hanziList.length,
                successCount,
                failedFiles: results.filter(r => !r.success)
            };

        } catch (error) {
            clearInterval(progressInterval);
            console.error('[CacheManager] Preload failed:', error);
            throw error;
        }
    }

    /**
     * Create cache settings panel
     */
    static createSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'cache-settings-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
            z-index: 9999;
            min-width: 250px;
        `;

        panel.innerHTML = `
            <div style="margin-bottom: 8px;">
                <strong>Cache Settings</strong>
            </div>
            <button id="cache-stats-btn" style="
                display: block;
                width: 100%;
                padding: 8px;
                margin-bottom: 8px;
                background: #007AFF;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            ">View Cache Stats</button>
            <button id="preload-basic-btn" style="
                display: block;
                width: 100%;
                padding: 8px;
                margin-bottom: 8px;
                background: #34C759;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            ">Preload Basic Audio</button>
            <button id="preload-intermediate-btn" style="
                display: block;
                width: 100%;
                padding: 8px;
                margin-bottom: 8px;
                background: #FF9500;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            ">Preload Intermediate</button>
            <button id="preload-advanced-btn" style="
                display: block;
                width: 100%;
                padding: 8px;
                margin-bottom: 8px;
                background: #FF3B30;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            ">Preload Advanced</button>
            <button id="clear-audio-btn" style="
                display: block;
                width: 100%;
                padding: 8px;
                margin-bottom: 8px;
                background: #FF6B6B;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            ">Clear Audio Cache</button>
            <button id="clear-all-btn" style="
                display: block;
                width: 100%;
                padding: 8px;
                background: #8B0000;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            ">Clear All</button>
            <button id="close-settings-btn" style="
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
            ">&times;</button>
        `;

        // Event listeners
        document.getElementById('cache-stats-btn').addEventListener('click', () => {
            CacheManager.logCacheStats();
            alert('Check browser console for cache statistics');
        });

        document.getElementById('clear-audio-btn').addEventListener('click', () => {
            CacheManager.clearAudioCache();
        });

        document.getElementById('clear-all-btn').addEventListener('click', () => {
            CacheManager.clearAllCache();
        });

        document.getElementById('close-settings-btn').addEventListener('click', () => {
            panel.remove();
        });

        return panel;
    }

    /**
     * Show settings panel
     */
    static showSettingsPanel() {
        const existing = document.getElementById('cache-settings-panel');
        if (existing) {
            existing.remove();
        }
        const panel = this.createSettingsPanel();
        document.body.appendChild(panel);
    }
}

export { CacheManager };
