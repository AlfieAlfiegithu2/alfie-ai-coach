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
  isPremium = false
}: PricingCardProps) => {
  const containerClasses = isPopular
    ? "relative flex flex-col h-full rounded-2xl border p-8 border-neutral-200 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 scale-105 ring-1 ring-black/5"
    : "flex flex-col h-full rounded-2xl border p-8 border-neutral-100 bg-white/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1";

  const buttonClasses = isPremium
    ? "mt-8 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-medium transition bg-[#1a1a1a] text-white hover:bg-black shadow-lg hover:shadow-xl"
    : "mt-8 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-medium transition bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50";

  const priceClasses = "text-5xl font-serif font-medium text-[#1a1a1a] tracking-tight";

  return (
    <div className={containerClasses}>
      {isPopular && badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a1a] px-4 py-1.5 text-xs font-medium text-white shadow-lg">
            <Star className="h-3 w-3 text-amber-300" />
            {badge}
          </span>
        </div>
      )}

      <div className={`text-center ${isPopular ? 'mt-2' : ''}`}>
        <h3 className="text-xl font-medium tracking-tight font-serif text-[#1a1a1a]">{title}</h3>
        <p className="mt-3 text-sm text-neutral-500 min-h-[40px] leading-relaxed">{subtitle}</p>
        <div className="mt-8 flex items-baseline justify-center gap-1">
          <span className={priceClasses}>{price}</span>
          <span className="text-sm text-neutral-500 font-medium">{period}</span>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-neutral-100 flex-grow">
        <ul className="space-y-4">
          {features.map((feature, index) => {
            const isDisabled = index === features.length - 1 && title === "Starter";
            return (
              <li
                key={index}
                className={`flex items-start gap-3 text-sm ${isDisabled ? 'text-neutral-400 line-through' : 'text-neutral-700'
                  }`}
              >
                {isDisabled ? (
                  <X className="h-4 w-4 text-neutral-300 flex-shrink-0 mt-0.5" />
                ) : (
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                <span className="leading-tight">{feature}</span>
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
