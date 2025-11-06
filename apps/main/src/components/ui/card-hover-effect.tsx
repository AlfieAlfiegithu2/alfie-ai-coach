import React, { useState } from "react";
import { motion } from "framer-motion";

export const HoverEffect = ({
  items,
  onItemClick
}: {
  items: any[],
  onItemClick?: (link: string) => void
}) => {
  let [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 py-10">
      {items.map((item, idx) => (
        <div
          key={item?.link}
          className="relative group block p-2 h-full w-full cursor-pointer"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={() => onItemClick?.(item?.link)}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
          <div className="relative bg-white/60 backdrop-blur-md border border-white/20 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-500 h-full flex flex-col justify-center">
            <div className="font-bold text-black text-xl mb-2">{item.title}</div>
            <div className="font-light text-black/70 text-sm">{item.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export function CardHoverEffectDemo() {
  const handleItemClick = (link: string) => {
    window.open(link, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto px-8">
      <HoverEffect items={projects} onItemClick={handleItemClick} />
    </div>
  );
}

export const projects = [
  {
    title: "Stripe",
    description:
      "A technology company that builds economic infrastructure for the internet.",
    link: "https://stripe.com",
  },
  {
    title: "Netflix",
    description:
      "A streaming service that offers a wide variety of award-winning TV shows, movies, anime, documentaries, and more on thousands of internet-connected devices.",
    link: "https://netflix.com",
  },
  {
    title: "Google",
    description:
      "A multinational technology company that specializes in Internet-related services and products.",
    link: "https://google.com",
  },
  {
    title: "Meta",
    description:
      "A technology company that focuses on building products that advance Facebook's mission of bringing the world closer together.",
    link: "https://meta.com",
  },
  {
    title: "Amazon",
    description:
      "A multinational technology company focusing on e-commerce, cloud computing, digital streaming, and artificial intelligence.",
    link: "https://amazon.com",
  },
  {
    title: "Microsoft",
    description:
      "A multinational technology company that develops, manufactures, licenses, supports, and sells computer software, consumer electronics, personal computers, and related services.",
    link: "https://microsoft.com",
  },
];
