import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe, StripeElementLocale } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { config } from '@/config/runtime';
import { useTranslation } from 'react-i18next';
import { usePageTranslation, PageContent } from '@/hooks/usePageTranslation';
import { normalizeLanguageCode } from '@/lib/languageUtils';
import { ArrowLeft, Crown, Sparkles, Check, Lock, Loader2, Zap, Clock, Tag } from 'lucide-react';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// Weekly prices shown as monthly equivalent (base "original" price)
// Pro: $20/week = $80/month, Ultra: $75/week = $300/month
const WEEKLY_PRICES = {
  pro: 20,       // $20/week
  ultra: 75,     // $75/week = $300/month equivalent
};

// Display "original" prices (weekly rate × 4 for monthly equivalent)
const DISPLAY_PRICES = {
  pro: WEEKLY_PRICES.pro * 4,      // $80/month equivalent
  ultra: WEEKLY_PRICES.ultra * 4,  // $300/month equivalent
};

// Final prices per month for each billing cycle (ending in 9)
const FINAL_PRICES = {
  pro: {
    monthly: 49,      // $49/month
    threeMonth: 39,   // $39/month
    sixMonth: 29,     // $29/month
  },
  ultra: {
    monthly: 199,     // $199/month
    threeMonth: 149,  // $149/month
    sixMonth: 119,    // $119/month
  },
};

// Calculate discount percentages dynamically based on final prices
const DISCOUNTS = {
  pro: {
    week: 0,
    monthly: Math.round((1 - FINAL_PRICES.pro.monthly / DISPLAY_PRICES.pro) * 100),           // ~39%
    threeMonth: Math.round((1 - FINAL_PRICES.pro.threeMonth / DISPLAY_PRICES.pro) * 100),     // ~51%
    sixMonth: Math.round((1 - FINAL_PRICES.pro.sixMonth / DISPLAY_PRICES.pro) * 100),         // ~64%
  },
  ultra: {
    week: 0,
    monthly: Math.round((1 - FINAL_PRICES.ultra.monthly / DISPLAY_PRICES.ultra) * 100),       // ~34%
    threeMonth: Math.round((1 - FINAL_PRICES.ultra.threeMonth / DISPLAY_PRICES.ultra) * 100), // ~50%
    sixMonth: Math.round((1 - FINAL_PRICES.ultra.sixMonth / DISPLAY_PRICES.ultra) * 100),     // ~60%
  },
};

// Alias for compatibility
const MONTHLY_PRICES = FINAL_PRICES.pro;
const BASE_PRICES = { pro: FINAL_PRICES.pro.monthly, ultra: FINAL_PRICES.ultra.monthly };

const defaultPaymentContent: PageContent = {
  navigation: {
    backButton: 'Back to Plans',
  },
  planSelector: {
    title: 'Select Plan',
    priceFrom: 'from',
    priceSuffix: 'Plan',
    perMonthSuffix: '/mo',
    plans: {
      pro: {
        label: 'Pro',
        description: 'Unlimited AI Practice & Feedback',
        features: [
          'Unlimited AI Practice Tests',
          'Examiner-Level Detailed Feedback',
          'Advanced Pronunciation Coaching',
          'Personalized Study Roadmap',
        ],
      },
      ultra: {
        label: 'Ultra',
        description: 'Ultimate Mentorship Package',
        features: [
          'Everything in Pro Plan',
          '1-on-1 Personal Meeting with Developers',
          'All Premium Templates & E-books',
          'Direct Access to New Beta Features',
        ],
      },
    },
  },
  header: {
    title: 'Complete Payment',
    subtitle: 'Choose your billing cycle',
  },
  billingCycle: {
    label: 'Billing Cycle',
    weeklyLabel: '1 Week',
    monthlyLabel: 'Monthly',
    monthsLabel: '{{months}} Months',
    saveBadge: 'SAVE {{percent}}%',
  },
  summary: {
    subtotal: 'Subtotal ({{duration}})',
    planDiscount: 'Plan Discount ({{percent}}% off)',
    promoCode: 'Promo Code ({{code}})',
    totalDue: 'Total Due',
    currencyLabel: '{{currency}}',
  },
  coupon: {
    heading: 'Discount Code (Optional)',
    placeholder: 'Enter coupon code',
    applyButton: 'Apply',
    removeButton: 'Remove',
    verifiedPercentMessage: '{{percent}}% off applied!',
    verifiedFixedMessage: '{{value}} off applied!',
    errors: {
      required: 'Please enter a code',
      invalid: 'Invalid code',
      expired: 'Code has expired',
      maxedOut: 'Code has reached maximum uses',
      validation: 'Failed to validate code',
    },
  },
  region: {
    label: 'Region',
    options: {
      international: 'International',
      china: 'China',
      korea: 'Korea',
    },
    hints: {
      korea: 'Kakao Pay, Naver Pay, Korean Cards available',
      china: 'Alipay, WeChat Pay available',
    },
  },
  checkout: {
    label: 'Checkout',
    options: {
      embedded: 'Pay Here',
      redirect: 'Stripe Checkout',
    },
    descriptions: {
      korea: 'Pay with Kakao Pay, Naver Pay, or Korean Cards via Stripe.',
      china: 'Pay with Alipay, WeChat Pay via Stripe.',
      default: 'Pay with Card, Apple Pay, Google Pay, or Crypto via Stripe.',
    },
    secureButton: 'Pay Securely {{amount}}',
    button: 'Pay {{amount}}',
    loading: 'Initializing secure checkout...',
    termsIntro: 'By clicking pay, you read and agree to our',
    termsAnd: 'and',
    termsLink: 'Terms',
    privacyLink: 'Privacy Policy',
    refundLink: 'Refund Policy',
    renews: 'Subscription automatically renews. Cancel anytime in Settings.',
  },
  error: {
    loading: 'Failed to load payment form',
  },
};

const STRIPE_LOCALE_MAP: Record<string, StripeElementLocale> = {
  ar: 'ar',
  bg: 'bg',
  cs: 'cs',
  da: 'da',
  de: 'de',
  el: 'el',
  en: 'en',
  es: 'es',
  fi: 'fi',
  fr: 'fr',
  he: 'he',
  hu: 'hu',
  id: 'id',
  it: 'it',
  ja: 'ja',
  ko: 'ko',
  lt: 'lt',
  lv: 'lv',
  ms: 'ms',
  nb: 'nb',
  no: 'nb',
  nl: 'nl',
  pl: 'pl',
  pt: 'pt',
  ro: 'ro',
  ru: 'ru',
  sk: 'sk',
  sl: 'sl',
  sv: 'sv',
  th: 'th',
  tr: 'tr',
  vi: 'vi',
  zh: 'zh',
};

// Plan details
const PLANS = {
  premium: {
    name: 'Pro',
    description: 'Unlimited AI Practice & Feedback',
    features: [
      'Unlimited AI Practice Tests',
      'Examiner-Level Detailed Feedback',
      'Advanced Pronunciation Coaching',
      'Personalized Study Roadmap',
    ],
    icon: Sparkles,
    color: 'from-[#d97757] to-[#e8956f]',
    shadowColor: 'shadow-[#d97757]/20',
    basePrice: BASE_PRICES.pro,
  },
  pro: {
    name: 'Pro',
    description: 'Unlimited AI Practice & Feedback',
    features: [
      'Unlimited AI Practice Tests',
      'Examiner-Level Detailed Feedback',
      'Advanced Pronunciation Coaching',
      'Personalized Study Roadmap',
    ],
    icon: Sparkles,
    color: 'from-[#d97757] to-[#e8956f]',
    shadowColor: 'shadow-[#d97757]/20',
    basePrice: BASE_PRICES.pro,
  },
  ultra: {
    name: 'Ultra',
    description: 'Ultimate Mentorship Package',
    features: [
      'Everything in Pro Plan',
      '1-on-1 Personal Meeting with Developers',
      'All Premium Templates & E-books',
      'Direct Access to New Beta Features',
    ],
    icon: Crown,
    color: 'from-amber-500 to-yellow-400',
    shadowColor: 'shadow-amber-500/20',
    basePrice: BASE_PRICES.ultra,
  }
};

const stripePromise = loadStripe(config.stripe.publishableKey);

interface EmbeddedCheckoutFormProps {
  plan: typeof PLANS.pro;
  totalAmount: number;
  currency: string;
  region: 'international' | 'korea' | 'china';
  onSuccess: () => void;
  onError: (message: string) => void;
  payButtonLabel: string;
  renewsText: string;
}

const EmbeddedCheckoutForm = ({
  plan,
  totalAmount,
  currency,
  region,
  onSuccess,
  onError,
  payButtonLabel,
  renewsText,
}: EmbeddedCheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?payment=success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'Payment failed');
      onError(error.message || 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess();
    } else {
      setProcessing(false);
    }
  };

  // Payment method types based on region
  const getPaymentMethodTypes = () => {
    if (region === 'korea') {
      // Korea: Kakao Pay, Naver Pay, Korean Cards (no regular card)
      return ['card', 'kakao_pay', 'naver_pay'];
    } else if (region === 'china') {
      // China: Alipay, WeChat Pay
      return ['alipay', 'wechat_pay'];
    } else {
      // International: Card, Apple Pay, Google Pay (no Alipay/WeChat)
      return ['card', 'apple_pay', 'google_pay'];
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
          business: { name: 'English AIdol' },
          paymentMethodOrder: getPaymentMethodTypes(),
        }}
      />
      {message && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2"><Zap className="w-4 h-4" /> {message}</div>}

      <div className="space-y-4">
        <button
          type="submit"
          disabled={!stripe || processing}
          className={`w-full bg-gradient-to-r ${plan.color} text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 transform active:scale-[0.98] duration-200`}
        >
          {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
          {payButtonLabel}
        </button>

        <p className="text-center text-xs text-[#8B6914] font-sans">
          By clicking pay, you read and agree to our{' '}
          <a href="/terms-of-service" className="underline hover:text-[#5D4E37] transition-colors" target="_blank" rel="noopener noreferrer">Terms</a>,{' '}
          <a href="/privacy-policy" className="underline hover:text-[#5D4E37] transition-colors" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          {' '}and{' '}
          <a href="/refund-policy" className="underline hover:text-[#5D4E37] transition-colors" target="_blank" rel="noopener noreferrer">Refund Policy</a>.
        </p>
        <p className="text-center text-xs text-[#A68B5B] font-sans mt-2">
          {renewsText}
        </p>
      </div>
    </form>
  );
};

const Pay = () => {
  const query = useQuery();
  const initialPlanId = query.get('plan') || 'premium';
  const cancelled = query.get('cancelled');
  const { i18n } = useTranslation();
  const normalizedLanguage = normalizeLanguageCode(i18n.language);
  const { content } = usePageTranslation('payment-page', defaultPaymentContent, normalizedLanguage);
  const stripeLocale = STRIPE_LOCALE_MAP[normalizedLanguage] ?? 'auto';
  const sessionLocale = stripeLocale === 'auto' ? undefined : stripeLocale;

  const getContentValue = (path: string[], fallback = ''): string => {
    let current: any = content;
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return fallback;
      }
    }
    return typeof current === 'string' ? current : fallback;
  };

  const formatTemplate = (template: string, values?: Record<string, string | number>) => {
    if (!values) return template;
    return Object.entries(values).reduce((text, [key, value]) => {
      return text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
    }, template);
  };

  const localize = (
    path: string[],
    fallback: string,
    values?: Record<string, string | number>
  ) => {
    const template = getContentValue(path, fallback);
    return values ? formatTemplate(template, values) : template;
  };
  const couponErrorMessages = {
    required: localize(['coupon', 'errors', 'required'], 'Please enter a code'),
    invalid: localize(['coupon', 'errors', 'invalid'], 'Invalid code'),
    expired: localize(['coupon', 'errors', 'expired'], 'Code has expired'),
    maxedOut: localize(['coupon', 'errors', 'maxedOut'], 'Code has reached maximum uses'),
    validation: localize(['coupon', 'errors', 'validation'], 'Failed to validate code'),
  };
  const navigationBackLabel = localize(['navigation', 'backButton'], 'Back to Plans');
  const planSelectorTitle = localize(['planSelector', 'title'], 'Select Plan');
  const planPriceFrom = localize(['planSelector', 'priceFrom'], 'from');
  const planPriceSuffix = localize(['planSelector', 'priceSuffix'], 'Plan');
  const perMonthSuffixLabel = localize(['planSelector', 'perMonthSuffix'], '/mo');
  const headerTitle = localize(['header', 'title'], 'Complete Payment');
  const headerSubtitle = localize(['header', 'subtitle'], 'Choose your billing cycle');
  const billingCycleLabel = localize(['billingCycle', 'label'], 'Billing Cycle');
  const billingWeeklyLabel = localize(['billingCycle', 'weeklyLabel'], '1 Week');
  const billingMonthlyLabel = localize(['billingCycle', 'monthlyLabel'], 'Monthly');
  const billingMonthsLabel = localize(['billingCycle', 'monthsLabel'], '{{months}} Months');
  const billingSaveBadge = localize(['billingCycle', 'saveBadge'], 'SAVE {{percent}}%');
  const summarySubtotalTemplate = localize(['summary', 'subtotal'], 'Subtotal ({{duration}})');
  const summaryPlanDiscountTemplate = localize(['summary', 'planDiscount'], 'Plan Discount ({{percent}}% off)');
  const summaryPromoTemplate = localize(['summary', 'promoCode'], 'Promo Code ({{code}})');
  const summaryTotalDueLabel = localize(['summary', 'totalDue'], 'Total Due');
  const summaryCurrencyLabel = localize(['summary', 'currencyLabel'], '{{currency}}');
  const couponHeadingLabel = localize(['coupon', 'heading'], 'Discount Code (Optional)');
  const couponPlaceholderLabel = localize(['coupon', 'placeholder'], 'Enter coupon code');
  const couponApplyLabel = localize(['coupon', 'applyButton'], 'Apply');
  const couponRemoveLabel = localize(['coupon', 'removeButton'], 'Remove');
  const regionLabelText = localize(['region', 'label'], 'Region');
  const regionInternationalLabel = localize(['region', 'options', 'international'], 'International');
  const regionChinaLabel = localize(['region', 'options', 'china'], 'China');
  const regionKoreaLabel = localize(['region', 'options', 'korea'], 'Korea');
  const regionHintKorea = localize(['region', 'hints', 'korea'], 'Kakao Pay, Naver Pay, Korean Cards available');
  const regionHintChina = localize(['region', 'hints', 'china'], 'Alipay, WeChat Pay available');
  const checkoutLabelText = localize(['checkout', 'label'], 'Checkout');
  const checkoutEmbeddedLabel = localize(['checkout', 'options', 'embedded'], 'Pay Here');
  const checkoutRedirectLabel = localize(['checkout', 'options', 'redirect'], 'Stripe Checkout');
  const checkoutDescriptionKorea = localize(
    ['checkout', 'descriptions', 'korea'],
    'Pay with Kakao Pay, Naver Pay, or Korean Cards via Stripe.'
  );
  const checkoutDescriptionChina = localize(
    ['checkout', 'descriptions', 'china'],
    'Pay with Alipay, WeChat Pay via Stripe.'
  );
  const checkoutDescriptionDefault = localize(
    ['checkout', 'descriptions', 'default'],
    'Pay with Card, Apple Pay, Google Pay, or Crypto via Stripe.'
  );
  const checkoutButtonTemplate = localize(['checkout', 'button'], 'Pay {{amount}}');
  const checkoutSecureButtonTemplate = localize(['checkout', 'secureButton'], 'Pay Securely {{amount}}');
  const checkoutLoadingText = localize(['checkout', 'loading'], 'Initializing secure checkout...');
  const checkoutTermsIntro = localize(['checkout', 'termsIntro'], 'By clicking pay, you read and agree to our');
  const checkoutTermsAnd = localize(['checkout', 'termsAnd'], 'and');
  const checkoutTermsLink = localize(['checkout', 'termsLink'], 'Terms');
  const checkoutPrivacyLink = localize(['checkout', 'privacyLink'], 'Privacy Policy');
  const checkoutRefundLink = localize(['checkout', 'refundLink'], 'Refund Policy');
  const checkoutRenewsText = localize(
    ['checkout', 'renews'],
    'Subscription automatically renews. Cancel anytime in Settings.'
  );
  const getPlanTranslationNode = (planKey: 'pro' | 'ultra') => {
    const selector = (content as Record<string, any>)?.planSelector as Record<string, any> | undefined;
    const plans = selector?.plans as Record<string, any> | undefined;
    return (plans && plans[planKey]) ? (plans[planKey] as Record<string, any>) : {};
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const navigate = useNavigate();

  // State for billing selection
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'ultra'>(initialPlanId === 'ultra' ? 'ultra' : 'pro');
  const [billingCycle, setBillingCycle] = useState<'week' | 1 | 3 | 6>(1);
  const [isSubscription, setIsSubscription] = useState(true);
  const [checkoutMode, setCheckoutMode] = useState<'embedded' | 'redirect'>('embedded'); // embedded = pay here, redirect = stripe checkout
  const [couponCode, setCouponCode] = useState('');
  const [region, setRegion] = useState<'international' | 'korea' | 'china'>('international');

  // Affiliate code validation state
  const [validatedAffiliateCode, setValidatedAffiliateCode] = useState<{
    code: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    message: string;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Currency based on region
  const currency = region === 'korea' ? 'krw' : region === 'china' ? 'cny' : 'usd';

  const plan = PLANS[selectedPlan];
  const planId = selectedPlan === 'pro' ? 'premium' : 'ultra'; // API uses 'premium' for pro
  const isHttps = window.location.protocol === 'https:';

  // Calculate total price - Fixed logic
  const getDiscountPercent = (cycle: 'week' | number, planKey: 'pro' | 'ultra') => {
    const planDiscounts = DISCOUNTS[planKey];
    if (cycle === 'week') return planDiscounts.week;
    if (cycle === 6) return planDiscounts.sixMonth;
    if (cycle === 3) return planDiscounts.threeMonth;
    if (cycle === 1) return planDiscounts.monthly;
    return 0;
  };

  const getFinalMonthlyPrice = (cycle: 'week' | number, planKey: 'pro' | 'ultra') => {
    const planPrices = FINAL_PRICES[planKey];
    if (cycle === 'week') return DISPLAY_PRICES[planKey]; // Weekly shows full price
    if (cycle === 6) return planPrices.sixMonth;
    if (cycle === 3) return planPrices.threeMonth;
    if (cycle === 1) return planPrices.monthly;
    return planPrices.monthly;
  };

  const symbols: Record<string, string> = { usd: '$', krw: '₩', cny: '¥' };
  const rates: Record<string, number> = { usd: 1, krw: 1350, cny: 7.2 }; // Approximate exchange rates

  const discountPercent = getDiscountPercent(billingCycle, selectedPlan);
  const displayPrice = DISPLAY_PRICES[selectedPlan]; // Original monthly price (weekly × 4)
  const finalMonthlyPrice = getFinalMonthlyPrice(billingCycle, selectedPlan);

  // Calculate based on billing cycle
  const isWeekly = billingCycle === 'week';

  // Calculate prices
  const months = isWeekly ? 0.25 : (billingCycle as number);
  const fullPriceUSD = Math.round(displayPrice * months); // Original price without discount
  const totalAmountUSD = isWeekly
    ? Math.round(displayPrice * 0.25) // Weekly: 1/4 of monthly display price
    : finalMonthlyPrice * (billingCycle as number); // Use exact final prices
  const discountAmountUSD = fullPriceUSD - totalAmountUSD;

  // Convert to selected currency
  const fullPrice = Math.round(fullPriceUSD * rates[currency]);
  const discountAmount = Math.round(discountAmountUSD * rates[currency]);
  const totalAmount = Math.round(totalAmountUSD * rates[currency]);

  // Effective monthly price for display
  const effectiveMonthlyPrice = Math.round(finalMonthlyPrice * rates[currency]);

  // Calculate affiliate discount
  let affiliateDiscountAmount = 0;
  if (validatedAffiliateCode) {
    if (validatedAffiliateCode.discountType === 'percent') {
      affiliateDiscountAmount = Math.round(totalAmount * (validatedAffiliateCode.discountValue / 100));
    } else {
      // Fixed amount - convert to selected currency
      affiliateDiscountAmount = Math.round(validatedAffiliateCode.discountValue * rates[currency]);
    }
  }
  const finalTotalAmount = Math.max(totalAmount - affiliateDiscountAmount, Math.round(1 * rates[currency])); // Minimum $1

  const planTranslationNode = getPlanTranslationNode(selectedPlan);
  const planLabel = localize(['planSelector', 'plans', selectedPlan, 'label'], plan.name);
  const planDescription = localize(
    ['planSelector', 'plans', selectedPlan, 'description'],
    plan.description
  );
  const planFeatures = Array.isArray(planTranslationNode.features)
    ? (planTranslationNode.features as string[])
    : plan.features;
  const planHeading = `${planLabel} ${planPriceSuffix}`;
  const formatCycleLabel = (cycle: 'week' | number) => {
    if (cycle === 'week') return billingWeeklyLabel;
    if (cycle === 1) return billingMonthlyLabel;
    return formatTemplate(billingMonthsLabel, { months: cycle });
  };
  const summaryDuration = isWeekly
    ? billingWeeklyLabel
    : billingCycle === 1
      ? billingMonthlyLabel
      : formatTemplate(billingMonthsLabel, { months: billingCycle });
  const subtotalLabel = formatTemplate(summarySubtotalTemplate, { duration: summaryDuration });
  const planDiscountLabel = formatTemplate(summaryPlanDiscountTemplate, { percent: discountPercent });
  const promoLabel = formatTemplate(summaryPromoTemplate, {
    code: validatedAffiliateCode?.code || '',
  });
  const currencyLabelWithValue = formatTemplate(summaryCurrencyLabel, {
    currency: currency.toUpperCase(),
  });
  const amountDisplay = `${symbols[currency]}${finalTotalAmount.toLocaleString()}`;
  const embeddedPayButtonLabel = formatTemplate(checkoutSecureButtonTemplate, {
    amount: amountDisplay,
  });
  const redirectPayButtonLabel = formatTemplate(checkoutButtonTemplate, {
    amount: amountDisplay,
  });
  const regionDescription =
    region === 'korea'
      ? checkoutDescriptionKorea
      : region === 'china'
        ? checkoutDescriptionChina
        : checkoutDescriptionDefault;

  // Validate affiliate/coupon code - direct database query (RLS allows SELECT on active codes)
  const validateCouponCode = async () => {
    if (!couponCode.trim()) {
      setCouponError(couponErrorMessages.required);
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    try {
      // Query affiliate_codes table directly - RLS allows SELECT on active codes
      const { data: codeData, error } = await supabase
        .from('affiliate_codes')
        .select('id, code, discount_type, discount_value, is_active, expires_at, max_redemptions, current_redemptions')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Code lookup error:', error);
        setCouponError(couponErrorMessages.validation);
        setValidatedAffiliateCode(null);
        return;
      }

      if (!codeData) {
        setCouponError(couponErrorMessages.invalid);
        setValidatedAffiliateCode(null);
        return;
      }

      // Check expiration
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        setCouponError(couponErrorMessages.expired);
        setValidatedAffiliateCode(null);
        return;
      }

      // Check max redemptions
      if (codeData.max_redemptions && codeData.current_redemptions >= codeData.max_redemptions) {
        setCouponError(couponErrorMessages.maxedOut);
        setValidatedAffiliateCode(null);
        return;
      }

      // Code is valid
      const discountMessage = codeData.discount_type === 'percent'
        ? localize(['coupon', 'verifiedPercentMessage'], '{{percent}}% off applied!', {
          percent: codeData.discount_value,
        })
        : localize(['coupon', 'verifiedFixedMessage'], '{{value}} off applied!', {
          value: `${symbols[currency] || ''}${codeData.discount_value}`,
        });

      setValidatedAffiliateCode({
        code: codeData.code,
        discountType: codeData.discount_type as 'percent' | 'fixed',
        discountValue: codeData.discount_value,
        message: discountMessage,
      });
      setCouponError(null);
    } catch (err: any) {
      console.error('Coupon validation error:', err);
      setCouponError(couponErrorMessages.validation);
      setValidatedAffiliateCode(null);
    } finally {
      setCouponLoading(false);
    }
  };

  // Clear affiliate code
  const clearAffiliateCode = () => {
    setValidatedAffiliateCode(null);
    setCouponCode('');
    setCouponError(null);
  };

  // Update subscription state - ALL are auto-renewal now
  useEffect(() => {
    setIsSubscription(true); // All plans auto-renew
  }, [billingCycle]);

  // Fetch embedded payment secret
  useEffect(() => {
    if (checkoutMode === 'embedded') {
      fetchClientSecret();
    }
  }, [checkoutMode, selectedPlan, billingCycle, currency, validatedAffiliateCode]);

  const fetchClientSecret = async () => {
    setLoading(true);
    setError(null);
    setClientSecret(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTimeout(() => navigate('/auth'), 500);
        return;
      }
      const { data, error: fnError } = await supabase.functions.invoke('create-embedded-payment', {
        body: {
          planId,
          months: billingCycle,
          currency,
          affiliateCode: validatedAffiliateCode?.code || undefined,
        }
      });
      if (fnError || !data?.clientSecret) throw new Error(fnError?.message || 'Init failed');
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error(err);
      setError(localize(['error', 'loading'], 'Failed to load payment form'));
    } finally {
      setLoading(false);
    }
  };

  const handleRedirectCheckout = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          planId,
          months: billingCycle,
          currency,
          successUrl: `${window.location.origin}/dashboard?payment=success&plan=${planId}`,
          cancelUrl: `${window.location.origin}/pay?plan=${planId}&cancelled=true`,
          affiliateCode: validatedAffiliateCode?.code || undefined,
          locale: sessionLocale,
        }
      });
      if (error || !data?.url) throw new Error('Checkout failed');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full font-serif bg-[#FFFAF0] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Panel - Plan Details */}
        <div className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
          <div className="bg-[#FFFAF0] rounded-3xl p-8 shadow-sm border border-[#E8D5A3] relative overflow-hidden group hover:shadow-md transition-all duration-500">

            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-[#8B6914] hover:text-[#5D4E37] mb-6 transition-colors font-medium">
              <ArrowLeft className="w-4 h-4" /> {navigationBackLabel}
            </button>

            {/* Plan Selector */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#5D4E37] mb-3 font-sans">{planSelectorTitle}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedPlan('pro')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${selectedPlan === 'pro'
                    ? 'border-[#d97757] bg-gradient-to-br from-[#d97757]/10 to-[#e8956f]/10'
                    : 'border-[#E8D5A3] hover:border-[#d97757]/50'
                    }`}
                >
                  <div className="mb-1">
                    <span className={`font-bold ${selectedPlan === 'pro' ? 'text-[#d97757]' : 'text-[#5D4E37]'}`}>
                      {localize(['planSelector', 'plans', 'pro', 'label'], 'Pro')}
                    </span>
                  </div>
                  <span className="text-sm text-[#8B6914]">
                    <span className="text-xs">{planPriceFrom} </span>${FINAL_PRICES.pro.sixMonth}
                    <span className="text-xs font-normal text-[#8B6914]">{perMonthSuffixLabel}</span>
                  </span>
                </button>
                <button
                  onClick={() => setSelectedPlan('ultra')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${selectedPlan === 'ultra'
                    ? 'border-amber-500 bg-gradient-to-br from-amber-500/10 to-yellow-400/10'
                    : 'border-[#E8D5A3] hover:border-amber-500/50'
                    }`}
                >
                  <div className="mb-1">
                    <span className={`font-bold ${selectedPlan === 'ultra' ? 'text-amber-600' : 'text-[#5D4E37]'}`}>
                      {localize(['planSelector', 'plans', 'ultra', 'label'], 'Ultra')}
                    </span>
                  </div>
                  <span className="text-sm text-[#8B6914]">
                    <span className="text-xs">{planPriceFrom} </span>${FINAL_PRICES.ultra.sixMonth}
                    <span className="text-xs font-normal text-[#8B6914]">{perMonthSuffixLabel}</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-[#5D4E37] tracking-tight">{planHeading}</h1>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-[#5D4E37] font-sans">{symbols[currency]}{effectiveMonthlyPrice.toLocaleString()}</span>
                <span className="text-[#8B6914] font-medium font-sans">{perMonthSuffixLabel}</span>
              </div>
              {/* Show savings from original price */}
              {discountPercent > 0 && (
                <p className="text-sm text-[#A68B5B] mt-1 font-sans">
                  <span className="line-through">{symbols[currency]}{Math.round(DISPLAY_PRICES[selectedPlan] * rates[currency]).toLocaleString()}{perMonthSuffixLabel}</span>
                  <span className="ml-2 text-green-600 font-medium">
                    {discountPercent}% off
                  </span>
                </p>
              )}
              <p className="text-base text-[#8B6914] mt-3 leading-relaxed">{planDescription}</p>
            </div>

            <div className="space-y-4">
              {planFeatures.map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#FDF6E3] transition-colors border border-transparent hover:border-[#E8D5A3]/30">
                  <div className="p-1 rounded-full bg-[#E8D5A3] mt-0.5 shrink-0">
                    <Check className="w-3 h-3 text-[#5D4E37]" />
                  </div>
                  <span className="text-sm font-medium text-[#5D4E37] leading-tight">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Checkout */}
        <div className="lg:col-span-7 bg-[#FFFAF0] rounded-3xl shadow-xl shadow-[#E8D5A3]/20 border border-[#E8D5A3] overflow-hidden flex flex-col order-1 lg:order-2">

          {/* Header */}
          <div className="p-8 border-b border-[#E8D5A3] bg-[#FDF6E3]/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#5D4E37] flex items-center gap-2 font-serif">
                  {headerTitle}
                </h2>
                <p className="text-sm text-[#8B6914] mt-1 font-sans">{headerSubtitle}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Billing Cycle Selector */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-[#5D4E37] mb-3 flex items-center gap-2 font-sans">
                <Clock className="w-4 h-4 text-[#A68B5B]" /> {billingCycleLabel}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1 Week Option */}
                <button
                  onClick={() => setBillingCycle('week')}
                  className={`relative p-4 rounded-xl border transition-all text-left group font-sans ${billingCycle === 'week'
                    ? `border-[#A68B5B] bg-[#FDF6E3] ring-1 ring-[#A68B5B]/30`
                    : 'border-[#E8D5A3] hover:border-[#A68B5B] hover:bg-[#FDF6E3]/50'
                    }`}
                >
                  <div className={`font-bold text-lg mb-1 ${billingCycle === 'week' ? 'text-[#5D4E37]' : 'text-[#8B6914]'}`}>
                    {formatCycleLabel('week')}
                  </div>
                  <div className="mt-2 text-sm font-bold text-[#5D4E37]">
                    {symbols[currency]}{Math.round(DISPLAY_PRICES[selectedPlan] * rates[currency]).toLocaleString()}
                    <span className="text-xs font-normal text-[#8B6914]">{perMonthSuffixLabel}</span>
                  </div>
                </button>

                {/* Monthly and multi-month options */}
                {[1, 3, 6].map((m) => {
                  const cycleDiscount = getDiscountPercent(m, selectedPlan);
                  const cycleFinalPrice = getFinalMonthlyPrice(m, selectedPlan);
                  const cycleMonthlyConverted = Math.round(cycleFinalPrice * rates[currency]);
                  return (
                    <button
                      key={m}
                      onClick={() => setBillingCycle(m as 1 | 3 | 6)}
                      className={`relative p-4 rounded-xl border transition-all text-left group font-sans ${billingCycle === m
                        ? `border-[#A68B5B] bg-[#FDF6E3] ring-1 ring-[#A68B5B]/30`
                        : 'border-[#E8D5A3] hover:border-[#A68B5B] hover:bg-[#FDF6E3]/50'
                        }`}
                    >
                      <div className="absolute -top-2.5 right-3 bg-[#A68B5B] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm tracking-wide">
                        {formatTemplate(billingSaveBadge, { percent: cycleDiscount })}
                      </div>
                      <div className={`font-bold text-lg mb-1 ${billingCycle === m ? 'text-[#5D4E37]' : 'text-[#8B6914]'}`}>
                        {formatCycleLabel(m)}
                      </div>
                      <div className="mt-2 text-sm font-bold text-[#5D4E37]">
                        {symbols[currency]}{cycleMonthlyConverted.toLocaleString()}
                        <span className="text-xs font-normal text-[#8B6914]">{perMonthSuffixLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-[#FDF6E3] rounded-2xl p-5 border border-[#E8D5A3] mb-8 font-sans">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8B6914]">{subtotalLabel}</span>
                  <span className="font-medium text-[#5D4E37]">{symbols[currency]}{fullPrice.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{planDiscountLabel}</span>
                    <span className="font-bold">-{symbols[currency]}{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {validatedAffiliateCode && affiliateDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-purple-600">
                    <span>{promoLabel}</span>
                    <span className="font-bold">-{symbols[currency]}{affiliateDiscountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-[#E8D5A3] pt-3 flex justify-between items-center">
                  <span className="font-bold text-lg text-[#5D4E37]">{summaryTotalDueLabel}</span>
                  <div className="text-right">
                    <span className="font-bold text-2xl text-[#5D4E37]">{symbols[currency]}{finalTotalAmount.toLocaleString()}</span>
                    <p className="text-[10px] text-[#8B6914] font-medium uppercase tracking-wider">
                      {currencyLabelWithValue}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#5D4E37] mb-3 font-sans flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#A68B5B]" /> {couponHeadingLabel}
              </label>

              {validatedAffiliateCode ? (
                // Show validated code
                <div className="flex items-center justify-between p-4 rounded-xl border border-green-300 bg-green-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-700 font-sans text-sm">{validatedAffiliateCode.code}</p>
                      <p className="text-xs text-green-600 font-sans">{validatedAffiliateCode.message}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearAffiliateCode}
                    className="text-sm text-red-500 hover:text-red-700 font-medium font-sans"
                  >
                    {couponRemoveLabel}
                  </button>
                </div>
              ) : (
                // Show input field
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      placeholder={couponPlaceholderLabel}
                      className={`flex-1 px-4 py-3 rounded-xl border ${couponError ? 'border-red-300' : 'border-[#E8D5A3]'} bg-[#FFFAF0] text-[#5D4E37] placeholder-[#A68B5B]/60 focus:outline-none focus:ring-2 focus:ring-[#A68B5B]/30 focus:border-[#A68B5B] font-sans text-sm`}
                    />
                    <button
                      type="button"
                      onClick={validateCouponCode}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-5 py-3 rounded-xl border border-[#E8D5A3] bg-[#FDF6E3] text-[#5D4E37] font-medium text-sm hover:bg-[#E8D5A3]/30 transition-colors font-sans disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : couponApplyLabel}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-red-500 font-sans">{couponError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Payment Method Tabs */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#5D4E37] mb-3 font-sans">{regionLabelText}</label>

              {/* Region Selector */}
              <div className="flex p-1 bg-[#FDF6E3] rounded-xl mb-4 border border-[#E8D5A3]">
                <button
                  onClick={() => setRegion('international')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all font-sans ${region === 'international'
                    ? 'bg-[#FFFAF0] text-[#5D4E37] shadow-sm border border-[#E8D5A3]'
                    : 'text-[#8B6914] hover:text-[#5D4E37]'
                    }`}
                >
                  {regionInternationalLabel}
                </button>
                <button
                  onClick={() => setRegion('china')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all font-sans ${region === 'china'
                    ? 'bg-[#FFFAF0] text-[#5D4E37] shadow-sm border border-[#E8D5A3]'
                    : 'text-[#8B6914] hover:text-[#5D4E37]'
                    }`}
                >
                  {regionChinaLabel}
                </button>
                <button
                  onClick={() => setRegion('korea')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all font-sans ${region === 'korea'
                    ? 'bg-[#FFFAF0] text-[#5D4E37] shadow-sm border border-[#E8D5A3]'
                    : 'text-[#8B6914] hover:text-[#5D4E37]'
                    }`}
                >
                  {regionKoreaLabel}
                </button>
              </div>
              {region === 'korea' && (
                <p className="text-xs text-[#8B6914] font-sans mb-4">
                  {regionHintKorea}
                </p>
              )}
              {region === 'china' && (
                <p className="text-xs text-[#8B6914] font-sans mb-4">
                  {regionHintChina}
                </p>
              )}

              {/* Checkout Mode Selector */}
              <label className="block text-sm font-semibold text-[#5D4E37] mb-3 font-sans mt-4">{checkoutLabelText}</label>
              <div className="flex p-1 bg-[#FDF6E3] rounded-xl mb-4 border border-[#E8D5A3]">
                <button
                  onClick={() => setCheckoutMode('embedded')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all font-sans ${checkoutMode === 'embedded'
                    ? 'bg-[#FFFAF0] text-[#5D4E37] shadow-sm border border-[#E8D5A3]'
                    : 'text-[#8B6914] hover:text-[#5D4E37]'
                    }`}
                >
                  {checkoutEmbeddedLabel}
                </button>
                <button
                  onClick={() => setCheckoutMode('redirect')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all font-sans ${checkoutMode === 'redirect'
                    ? 'bg-[#FFFAF0] text-[#5D4E37] shadow-sm border border-[#E8D5A3]'
                    : 'text-[#8B6914] hover:text-[#5D4E37]'
                    }`}
                >
                  {checkoutRedirectLabel}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                <Zap className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Payment Forms */}
            {checkoutMode === 'embedded' && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                {loading && !clientSecret ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#8B6914] gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[#A68B5B]" />
                    <span className="text-sm font-medium">{checkoutLoadingText}</span>
                  </div>
                ) : clientSecret ? (
                  <Elements
                    key={`${clientSecret}-${region}-${currency}-${stripeLocale}`}
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      locale: stripeLocale,
                      appearance: {
                        theme: 'flat',
                        variables: {
                          colorPrimary: '#A68B5B',
                          colorBackground: '#FFFAF0',
                          colorText: '#5D4E37',
                          colorDanger: '#ef4444',
                          borderRadius: '12px',
                          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                        },
                        rules: {
                          '.Label': {
                            marginBottom: '8px',
                          },
                          '.Tab--selected': {
                            borderColor: '#A68B5B',
                            boxShadow: '0 0 0 1px #A68B5B',
                          },
                        }
                      }
                    }}>
                    <EmbeddedCheckoutForm
                      plan={plan}
                      totalAmount={finalTotalAmount}
                      currency={currency}
                      region={region}
                      onSuccess={() => navigate('/dashboard?payment=success')}
                      onError={setError}
                      payButtonLabel={embeddedPayButtonLabel}
                      renewsText={checkoutRenewsText}
                    />
                  </Elements>
                ) : null}
              </div>
            )}

            {checkoutMode === 'redirect' && (
              <div className="text-center py-6 animate-in fade-in zoom-in-95 duration-300">
                <p className="text-[#8B6914] text-sm mb-6 max-w-sm mx-auto font-sans">
                  {regionDescription}
                </p>
                <button
                  onClick={handleRedirectCheckout}
                  disabled={loading}
                  className={`w-full bg-[#A68B5B] text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-[#A68B5B]/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 font-sans`}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                  {redirectPayButtonLabel}
                </button>
                <p className="text-center text-xs text-[#8B6914] font-sans mt-4">
                  {checkoutTermsIntro}{' '}
                  <a href="/terms-of-service" className="underline hover:text-[#5D4E37] transition-colors" target="_blank" rel="noopener noreferrer">
                    {checkoutTermsLink}
                  </a>,{' '}
                  <a href="/privacy-policy" className="underline hover:text-[#5D4E37] transition-colors" target="_blank" rel="noopener noreferrer">
                    {checkoutPrivacyLink}
                  </a>{' '}
                  {checkoutTermsAnd}{' '}
                  <a href="/refund-policy" className="underline hover:text-[#5D4E37] transition-colors" target="_blank" rel="noopener noreferrer">
                    {checkoutRefundLink}
                  </a>.
                </p>
                <p className="text-center text-xs text-[#A68B5B] font-sans mt-2">
                  Subscription automatically renews. Cancel anytime in Settings.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Pay;
