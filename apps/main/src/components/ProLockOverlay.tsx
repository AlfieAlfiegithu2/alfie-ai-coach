import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProLockOverlayProps {
    /** Whether the overlay is visible */
    isOpen: boolean;
    /** Callback when overlay is closed */
    onClose: () => void;
    /** Optional feature name to show in the message */
    featureName?: string;
    /** Total count of locked items (optional, for messaging) */
    totalLockedCount?: number;
}

/**
 * A gentle, themed overlay that appears when free users try to access locked content.
 * Matches the "note" theme aesthetic with warm colors.
 */
export function ProLockOverlay({
    isOpen,
    onClose,
    featureName = 'this content',
    totalLockedCount
}: ProLockOverlayProps) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleUpgrade = () => {
        navigate('/pricing');
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(93, 78, 55, 0.6)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300"
                style={{
                    backgroundColor: '#FFFDF5',
                    border: '2px solid #E8D5A3'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full transition-colors hover:bg-[#E8D5A3]/30"
                    style={{ color: '#8B6914' }}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Lock icon */}
                <div className="flex justify-center mb-6">
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, #E8D5A3 0%, #D4C4A8 100%)',
                            boxShadow: '0 8px 32px rgba(139, 105, 20, 0.2)'
                        }}
                    >
                        <Lock className="w-10 h-10" style={{ color: '#5D4E37' }} />
                    </div>
                </div>

                {/* Title */}
                <h3
                    className="text-2xl font-bold text-center mb-3 font-nunito"
                    style={{ color: '#5D4E37' }}
                >
                    Unlock Full Access
                </h3>

                {/* Message */}
                <p
                    className="text-center mb-6 leading-relaxed"
                    style={{ color: '#8B6914' }}
                >
                    {featureName} is available with <strong>Pro</strong> or <strong>Ultra</strong>.
                    {totalLockedCount && totalLockedCount > 1 && (
                        <span className="block mt-1 text-sm opacity-80">
                            Unlock {totalLockedCount}+ more tests and practice sessions!
                        </span>
                    )}
                </p>

                {/* Benefits */}
                <div
                    className="rounded-2xl p-4 mb-6"
                    style={{ backgroundColor: 'rgba(166, 139, 91, 0.1)' }}
                >
                    <div className="space-y-2">
                        {[
                            'Unlimited practice tests',
                            'Detailed AI feedback',
                            'Track your progress',
                            'All difficulty levels'
                        ].map((benefit, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: '#D97706' }} />
                                <span className="text-sm" style={{ color: '#5D4E37' }}>{benefit}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                    <Button
                        onClick={handleUpgrade}
                        className="w-full h-12 text-base font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                            background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                            color: 'white',
                            boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)'
                        }}
                    >
                        <Sparkles className="w-5 h-5 mr-2" />
                        Upgrade to Pro
                    </Button>

                    <button
                        onClick={onClose}
                        className="w-full py-3 text-sm font-medium transition-colors hover:underline"
                        style={{ color: '#8B6914' }}
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * A small lock badge to show on locked content cards
 */
export function LockBadge({ className = '' }: { className?: string }) {
    return (
        <div
            className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center ${className}`}
            style={{
                backgroundColor: 'rgba(139, 105, 20, 0.15)',
                border: '1px solid rgba(139, 105, 20, 0.3)'
            }}
        >
            <Lock className="w-3.5 h-3.5" style={{ color: '#8B6914' }} />
        </div>
    );
}

/**
 * Hook to manage the ProLockOverlay state
 */
export function useProLockOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [featureName, setFeatureName] = useState<string>();
    const [totalLockedCount, setTotalLockedCount] = useState<number>();

    const showLockOverlay = (name?: string, lockedCount?: number) => {
        setFeatureName(name);
        setTotalLockedCount(lockedCount);
        setIsOpen(true);
    };

    const hideLockOverlay = () => {
        setIsOpen(false);
    };

    return {
        isOpen,
        featureName,
        totalLockedCount,
        showLockOverlay,
        hideLockOverlay,
    };
}

export default ProLockOverlay;
