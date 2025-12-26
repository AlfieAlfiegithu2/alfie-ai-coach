import DotLottieLoadingAnimation from '@/components/animations/DotLottieLoadingAnimation';

/**
 * PageLoadingScreen - Default full-page loading screen for the application.
 * 
 * This component provides a consistent loading experience across all pages with:
 * - Cream background (#FFFAF0) matching the Note theme
 * - Rice paper texture overlay for premium paper feel
 * - DotLottie bunny animation (120px, no text)
 * 
 * Usage:
 * ```tsx
 * if (isLoading) {
 *   return <PageLoadingScreen />;
 * }
 * ```
 * 
 * For inline loading states (not full page), use DotLottieLoadingAnimation directly.
 */
const PageLoadingScreen = () => {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
            style={{ backgroundColor: '#FEF9E7' }}
        >
            {/* Paper texture overlay for Note theme */}
            <div
                className="absolute inset-0 pointer-events-none opacity-30 z-0"
                style={{
                    backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                    mixBlendMode: 'multiply'
                }}
            />
            {/* DotLottie animation - 120px, no text */}
            <div className="relative z-10">
                <DotLottieLoadingAnimation />
            </div>
        </div>
    );
};

export default PageLoadingScreen;
