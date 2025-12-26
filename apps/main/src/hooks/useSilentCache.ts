import { useState, useEffect, useCallback } from 'react';
import { SilentCache } from '@/lib/silentCache';

interface UseSilentCacheOptions<T> {
    key: string;
    fetcher: () => Promise<T>;
    onSuccess?: (data: T) => void;
    enabled?: boolean;
}

/**
 * useSilentCache Hook
 * 
 * Automatically handles the Silent Caching pattern for ANY page or component.
 * Use this for a lightning-fast UI that feels instantaneous.
 * 
 * @example
 * const { data, loading } = useSilentCache({
 *   key: 'my_test_data',
 *   fetcher: () => supabase.from('tests').select('*')
 * });
 */
export function useSilentCache<T>({ key, fetcher, onSuccess, enabled = true }: UseSilentCacheOptions<T>) {
    const [data, setData] = useState<T | null>(() => SilentCache.get<T>(key));
    const [loading, setLoading] = useState(!data); // Only show loader if we have NO cache
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        if (!enabled) return;

        try {
            const freshData = await fetcher();
            setData(freshData);
            SilentCache.set(key, freshData);
            if (onSuccess) onSuccess(freshData);
            setError(null);
        } catch (err: any) {
            console.error(`[SilentCache] Refresh failed for ${key}:`, err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [key, fetcher, onSuccess, enabled]);

    useEffect(() => {
        if (enabled) {
            refresh();
        }
    }, [enabled, key]); // Re-fetch only if key changes or becomes enabled

    return {
        data,
        loading,
        error,
        refresh,
        isCached: !!SilentCache.get(key)
    };
}
