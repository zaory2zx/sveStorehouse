interface CardImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export function CardImage({ src, alt, className = '' }: CardImageProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-sve-border bg-gradient-to-br from-sve-card to-sve-bg ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-sve-muted">
          无卡图
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
}
