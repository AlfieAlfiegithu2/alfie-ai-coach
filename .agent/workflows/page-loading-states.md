---
description: How to add loading states to new pages
---

# Page Loading States

When creating new pages that have loading states, use the **PageLoadingScreen** component for a consistent user experience.

## Default Full-Page Loading

For full-page loading states (e.g., when fetching initial data), use the `PageLoadingScreen` component:

```tsx
import PageLoadingScreen from '@/components/PageLoadingScreen';

const MyNewPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  // ... fetch data logic
  
  if (isLoading) {
    return <PageLoadingScreen />;
  }
  
  return (
    // Your page content
  );
};
```

## What PageLoadingScreen Includes

- **Cream background** (`#FFFAF0`) - Matches the Exam Selection Portal / Note theme
- **Rice paper texture overlay** - Premium paper feel
- **DotLottie bunny animation** - 120px size, no text
- **Full screen centered** - Covers entire viewport

## Inline Loading States

For smaller loading indicators within a page (e.g., loading a section, button loading state), use `DotLottieLoadingAnimation` directly:

```tsx
import DotLottieLoadingAnimation from '@/components/animations/DotLottieLoadingAnimation';

// Small inline loader (e.g., 32px for buttons)
<DotLottieLoadingAnimation size={32} />

// Medium inline loader (e.g., 60px for card sections)
<DotLottieLoadingAnimation size={60} />

// With message (optional)
<DotLottieLoadingAnimation message="Processing..." />
```

## Important Notes

1. **Do NOT use** the old `LoadingAnimation` or `CatLoadingAnimation` components for new pages
2. Always use `PageLoadingScreen` for full-page loading states
3. The cream background (`#FFFAF0`) and rice paper texture should be consistent across all loading screens
