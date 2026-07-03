import { Minus, Plus } from 'lucide-react';

interface QuantityControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}

export function QuantityControl({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
}: QuantityControlProps) {
  const btnClass =
    size === 'sm'
      ? 'flex h-7 w-7 items-center justify-center rounded-md border border-sve-border bg-sve-card text-sve-text hover:border-sve-gold/40'
      : 'flex h-9 w-9 items-center justify-center rounded-lg border border-sve-border bg-sve-card text-sve-text hover:border-sve-gold/40';

  const inputClass =
    size === 'sm'
      ? 'w-12 rounded-md border border-sve-border bg-sve-bg text-center text-sm'
      : 'w-14 rounded-lg border border-sve-border bg-sve-bg text-center text-sm';

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        className={btnClass}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus size={size === 'sm' ? 14 : 16} />
      </button>
      <input
        type="number"
        className={inputClass}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
      <button
        type="button"
        className={btnClass}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus size={size === 'sm' ? 14 : 16} />
      </button>
    </div>
  );
}
