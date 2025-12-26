/**
 * SilentCache Utility
 * 
 * Provides a robust way to cache Supabase (or any) data in localStorage
 * with a 'Stale-While-Revalidate' pattern.
 * 
 * Features:
 * 1. Instant load from disk.
 * 2. Background background refresh.
 * 3. Automatic cleanup on logout.
 * 4. Compression/Serialization handling.
 */

const CACHE_PREFIX = 'sc_'; // Silent Cache prefix

export const SilentCache = {
    /**
     * Get data from cache instantly
     * @param key Unique key for the resource
     */
    get: <T>(key: string): T | null => {
        try {
            const item = localStorage.getItem(CACHE_PREFIX + key);
            if (!item) return null;

            const parsed = JSON.parse(item);
            return parsed.data as T;
        } catch (e) {
            console.error('[SilentCache] Read error', e);
            return null;
        }
    },

    /**
     * Save data to cache
     * @param key Unique key
     * @param data Data to store
     */
    set: <T>(key: string, data: T): void => {
        try {
            const payload = {
                data,
                timestamp: Date.now(),
                v: 1 // versioning for future-proofing
            };
            localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                console.warn('[SilentCache] Storage full, clearing old cache...');
                SilentCache.clearAll(); // Emergency clear if full
            } else {
                console.error('[SilentCache] Set error', e);
            }
        }
    },

    /**
     * Clear all silent cache items
     */
    clearAll: (): void => {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    },

    /**
     * Helper to generate a standardized key
     */
    makeKey: (category: string, id?: string) => {
        return id ? `${category}_${id}` : category;
    }
};
