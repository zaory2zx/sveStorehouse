import { useState } from 'react';
import { CLASS_COLORS, CLASS_LABELS } from '../lib/constants';

interface CraftIconProps {
  className: string;
  size?: number;
}

const CRAFT_FILE: Record<string, string> = {
  Neutral: 'neutral',
  Forestcraft: 'forest',
  Swordcraft: 'sword',
  Runecraft: 'rune',
  Dragoncraft: 'dragon',
  Shadowcraft: 'abyss',
  Abysscraft: 'abyss',
  Havencraft: 'haven',
};

const CRAFT_SYMBOLS: Record<string, string> = {
  Neutral: 'N',
  Forestcraft: 'F',
  Swordcraft: 'S',
  Runecraft: 'R',
  Dragoncraft: 'D',
  Shadowcraft: 'A',
  Abysscraft: 'A',
  Havencraft: 'H',
};

export function CraftIcon({ className, size = 20 }: CraftIconProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const color = CLASS_COLORS[className] ?? '#8b93a7';
  const label = CLASS_LABELS[className] ?? className;
  const symbol = CRAFT_SYMBOLS[className] ?? label.slice(0, 1);
  const file = CRAFT_FILE[className] ?? 'neutral';
  const src = `/assets/craft/${file}.png`;

  return (
    <span
      className="relative inline-flex shrink-0 overflow-hidden rounded-full border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
      style={{ width: size, height: size }}
      title={label}
    >
      {!imgFailed && (
        <img
          src={src}
          alt={label}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
      {imgFailed && (
        <span
          className="flex h-full w-full items-center justify-center font-bold text-white"
          style={{
            background: `radial-gradient(circle at 30% 25%, ${color}ee, ${color} 55%, ${color}aa 100%)`,
            fontSize: Math.max(10, size * 0.42),
          }}
        >
          {symbol}
        </span>
      )}
    </span>
  );
}
