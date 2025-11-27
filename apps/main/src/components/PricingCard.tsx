import { Check, X, Star } from "lucide-react";

interface PricingCardProps {
  title: string;
  subtitle: string;
  price: string;
  period: string;
  features: string[];
  buttonText: string;
  onButtonClick: () => void;
  isPopular?: boolean;
  badge?: string;
  isPremium?: boolean;
  isBlack?: boolean;
  isGold?: boolean;
  originalPrice?: string;
  limitedTimeOffer?: boolean;
  className?: string;
}

export const PricingCard = ({
  title,
  subtitle,
  price,
  period,
  features,
  buttonText,
  onButtonClick,
  isPopular = false,
  badge,
  isPremium = false,
  isBlack = false,
  isGold = false,
  originalPrice,
  limitedTimeOffer = false,
  className = ""
}: PricingCardProps) => {
  // Claude-style card design: Clean, elegant, minimal borders
  const containerClasses = isPopular
    ? "relative flex flex-col rounded-3xl border border-[#d97757]/30 bg-white p-10 shadow-lg hover:shadow-xl transition-all duration-300 transform scale-[1.02]"
    : `flex flex-col rounded-3xl border border-[#e6e0d4] p-10 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 ${className}`;

  const buttonClasses = isGold
    ? "mt-auto w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-medium transition bg-yellow-500 text-white hover:bg-yellow-600 shadow-md hover:shadow-lg font-sans"
    : isBlack
    ? "mt-auto w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-medium transition bg-black text-white hover:bg-gray-800 shadow-md hover:shadow-lg font-sans"
    : isPopular
    ? "mt-auto w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-medium transition bg-[#d97757] text-white hover:bg-[#c56a4b] shadow-md hover:shadow-lg font-sans"
    : "mt-auto w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-medium transition bg-white border border-[#e6e0d4] text-[#3c3c3c] hover:bg-[#fcfbf9] shadow-sm hover:shadow-md font-sans";

  const priceClasses = isPremium
    ? "text-5xl font-serif font-medium text-[#2d2d2d]"
    : "text-5xl font-serif font-medium text-[#2d2d2d]";

  return (
    <div className={containerClasses}>
      {isPopular && badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d97757] px-4 py-1.5 text-xs font-medium text-white font-sans uppercase tracking-wider shadow-sm">
            <Star className="h-3 w-3 fill-white" />
            {badge}
          </span>
        </div>
      )}

      <div className={`text-center ${isPopular ? 'mt-2' : ''}`}>
        <h3 className="text-2xl font-serif font-medium tracking-tight text-[#2d2d2d]">{title}</h3>
        <p className="mt-3 text-base text-[#666666] font-sans min-h-[48px] leading-relaxed">{subtitle}</p>
        
        <div className="mt-8 flex flex-col items-center justify-end gap-1 min-h-[110px]">
          {limitedTimeOffer && (
            <span className="mb-2 inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[#d97757]/70">
              Limited Time Offer
            </span>
          )}
          {originalPrice && (
            <span className="text-lg text-[#666666] line-through font-sans">
              {originalPrice}
            </span>
          )}
          <div className="flex items-baseline justify-center gap-1">
            <span className={priceClasses}>{price}</span>
            <span className="text-base text-[#666666] font-sans">{period}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-[#e6e0d4]/50 pt-8 mb-8">
        <ul className="space-y-4">
          {features.map((feature, index) => {
            // No disabled logic needed for the simplified comparison
            return (
              <li
                key={index}
                className="flex items-start gap-3 text-[15px] font-sans text-[#3c3c3c]"
              >
                <div className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${isPopular ? 'bg-[#d97757]/10 text-[#d97757]' : 'bg-[#e6e0d4]/30 text-[#666666]'}`}>
                  <Check className="h-3 w-3" />
                </div>
                <span className="leading-relaxed">{feature}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <button onClick={onButtonClick} className={buttonClasses}>
        {buttonText}
      </button>
    </div>
  );
};