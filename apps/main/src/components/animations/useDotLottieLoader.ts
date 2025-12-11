import { useEffect, useState } from 'react';

/**
 * Hook to ensure the DotLottie web component is loaded and ready to use.
 * The script is now loaded synchronously in index.html, so we just wait for it to be available.
 */
export const useDotLottieLoader = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if the custom element is already defined
    if (typeof customElements !== 'undefined' && customElements.get('dotlottie-wc')) {
      setIsReady(true);
      return;
    }

    // Wait for the custom element to be defined
    const checkReady = () => {
      if (typeof customElements !== 'undefined' && customElements.get('dotlottie-wc')) {
        setIsReady(true);
      } else {
        // Check again in a short timeout
        setTimeout(checkReady, 10);
      }
    };

    checkReady();
  }, []);

  return isReady;
};
