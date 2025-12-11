import { useEffect } from 'react';

let loadPromise: Promise<void> | null = null;

/**
 * Ensures the DotLottie web component script is loaded once.
 * Adds the right attributes so Cloudflare/Rocket Loader leaves it alone
 * and so the fetch uses anonymous credentials (avoids preload warnings).
 */
const ensureDotLottieScript = () => {
  if (typeof window === 'undefined') return;
  if (typeof customElements !== 'undefined' && customElements.get('dotlottie-wc')) {
    return;
  }

  if (!loadPromise) {
    const existing = document.querySelector<HTMLScriptElement>('script[data-dotlottie-loader]');
    if (existing) {
      loadPromise = new Promise((resolve) => {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => resolve(), { once: true });
      });
      return;
    }

    loadPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.6.2/dist/dotlottie-wc.js';
      script.type = 'module';
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-dotlottie-loader', 'true');
      // Prevent Rocket Loader from re-ordering this script
      script.setAttribute('data-cfasync', 'false');
      script.onload = () => resolve();
      script.onerror = (err) => {
        console.error('Failed to load dotlottie-wc', err);
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  return loadPromise;
};

export const useDotLottieLoader = () => {
  useEffect(() => {
    ensureDotLottieScript();
  }, []);
};
