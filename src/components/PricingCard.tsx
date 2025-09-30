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
    ? "relative rounded-2xl border-2 p-8 border-amber-500 bg-amber-50/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 scale-105"
    : "rounded-2xl border p-8 border-black/10 bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1";

  const buttonClasses = isPremium
    ? "mt-8 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition bg-amber-600 text-white hover:bg-amber-700 font-nunito"
    : "mt-8 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition bg-black text-neutral-100 hover:bg-black/90 font-nunito";

  const priceClasses = isPremium
    ? "text-4xl font-bold text-amber-600 font-nunito"
    : "text-4xl font-bold text-black font-nunito";

  return (
    <div className={containerClasses}>
      {isPopular && badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white font-nunito">
            <Star className="h-3 w-3" />
            {badge}
          </span>
        </div>
      )}

      <div className={`text-center ${isPopular ? 'mt-2' : ''}`}>
        <h3 className="text-xl font-semibold tracking-tight font-nunito text-black">{title}</h3>
        <p className="mt-2 text-sm text-black/70 font-nunito min-h-[40px]">{subtitle}</p>
        <div className="mt-6">
          <span className={priceClasses}>{price}</span>
          <span className="text-sm text-black/60 font-nunito">{period}</span>
        </div>
      </div>

      <ul className="mt-8 space-y-3">
        {features.map((feature, index) => {
          const isDisabled = index === features.length - 1 && title === "Starter";
          return (
            <li
              key={index}
              className={`flex items-center gap-3 text-sm font-nunito ${
                isDisabled ? 'text-black/40 line-through' : ''
              }`}
            >
              {isDisabled ? (
                <X className="h-4 w-4 text-red-600 flex-shrink-0" />
              ) : (
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              )}
              <span>{feature}</span>
            </li>
          );
        })}
      </ul>

      <button onClick={onButtonClick} className={buttonClasses}>
        {buttonText}
      </button>
    </div>
  );
};
