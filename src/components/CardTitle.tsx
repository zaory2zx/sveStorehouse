import { displayCardId, displayName, subtitleName } from '../lib/constants';

interface CardTitleProps {
  card: {
    name?: string | null;
    name_zh?: string | null;
    name_en?: string | null;
    card_id?: string;
    canonical_id?: string;
  };
  className?: string;
  subtitleClassName?: string;
}

export function CardTitle({
  card,
  className = 'font-semibold',
  subtitleClassName = 'text-xs text-sve-muted',
}: CardTitleProps) {
  const primary = displayName(card);
  const subtitle = subtitleName(card);
  const cardNo = card.card_id ? displayCardId(card) : null;

  return (
    <div>
      <div className={className}>{primary}</div>
      {(subtitle || cardNo) && (
        <p className={subtitleClassName}>
          {[subtitle, cardNo].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}
