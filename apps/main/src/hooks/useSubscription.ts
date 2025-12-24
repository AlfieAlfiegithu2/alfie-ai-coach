import { useMemo } from 'react';
import { useAuth } from './useAuth';

// Subscription tiers with full access
const PAID_TIERS = ['pro', 'premium', 'ultra'];

interface UseSubscriptionReturn {
    /** True if user has Pro, Premium, or Ultra subscription */
    isPro: boolean;
    /** True if user is on free/explorer tier */
    isFree: boolean;
    /** Current subscription status string */
    subscriptionStatus: string;
    /** Check if user can access an item at given index (0-based) */
    canAccessItem: (index: number, freeLimit?: number) => boolean;
    /** Check if an item at given index is locked */
    isItemLocked: (index: number, freeLimit?: number) => boolean;
}

/**
 * Hook for subscription-based access control
 * 
 * @example
 * const { isPro, canAccessItem, isItemLocked } = useSubscription();
 * 
 * // Check if user can access test at index 2 (with 1 free item)
 * if (canAccessItem(2, 1)) { navigateToTest(); }
 * 
 * // Show lock icon
 * {isItemLocked(index, 1) && <Lock />}
 */
export function useSubscription(): UseSubscriptionReturn {
    const { profile } = useAuth();

    const subscriptionStatus = profile?.subscription_status || 'free';

    const isPro = useMemo(() => {
        return PAID_TIERS.includes(subscriptionStatus.toLowerCase());
    }, [subscriptionStatus]);

    const isFree = !isPro;

    /**
     * Check if user can access an item at the given index
     * @param index - 0-based index of the item
     * @param freeLimit - Number of free items allowed (default: 1)
     * @returns true if user can access the item
     */
    const canAccessItem = (index: number, freeLimit: number = 1): boolean => {
        // Pro users can access everything
        if (isPro) return true;
        // Free users can only access items within the free limit
        return index < freeLimit;
    };

    /**
     * Check if an item at the given index is locked
     * @param index - 0-based index of the item
     * @param freeLimit - Number of free items allowed (default: 1)
     * @returns true if item is locked for current user
     */
    const isItemLocked = (index: number, freeLimit: number = 1): boolean => {
        return !canAccessItem(index, freeLimit);
    };

    return {
        isPro,
        isFree,
        subscriptionStatus,
        canAccessItem,
        isItemLocked,
    };
}

export default useSubscription;
