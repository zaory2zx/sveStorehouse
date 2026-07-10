import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  placeholder: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  className?: string;
  maxListHeight?: string;
}

export function MultiSelectFilter({
  placeholder,
  options,
  values,
  onChange,
  className,
  maxListHeight = '16rem',
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  const summary = () => {
    if (values.length === 0) return placeholder;
    if (values.length === 1) {
      const opt = options.find((o) => o.value === values[0]);
      return opt?.label ?? values[0];
    }
    return `已选 ${values.length} 项`;
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        className={`select-field flex items-center gap-1.5 pr-2 ${
          values.length > 0 ? 'border-sve-gold/40' : ''
        }`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 flex-1 truncate text-left">{summary()}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-sve-muted transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-full max-w-xs rounded-lg border border-sve-border bg-sve-bg py-1 shadow-lg"
          style={{ maxHeight: maxListHeight, overflowY: 'auto' }}
        >
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-sve-border/30"
            >
              <input
                type="checkbox"
                className="accent-sve-gold"
                checked={values.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
