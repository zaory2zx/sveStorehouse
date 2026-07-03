import {
  CardVariant,
  VARIANT_LABELS,
  displayCardId,
  displayName,
} from './constants';

export interface CardListExportItem {
  img_url?: string;
  name?: string;
  name_zh?: string;
  name_en?: string;
  card_id: string;
  canonical_id?: string;
  variant: CardVariant;
  quantity: number;
}

interface Layout {
  cols: number;
  cardW: number;
  cardH: number;
  gap: number;
  padding: number;
  headerH: number;
  labelH: number;
}

const COLORS = {
  bg: '#0d0f14',
  surface: '#12151c',
  border: '#2a3142',
  text: '#e8eaef',
  muted: '#8b93a7',
  gold: '#c9a227',
  badge: '#1a1710',
};

function pickLayout(count: number): Layout {
  if (count <= 30) {
    return { cols: 6, cardW: 140, cardH: 196, gap: 16, padding: 32, headerH: 80, labelH: 52 };
  }
  if (count <= 80) {
    return { cols: 8, cardW: 120, cardH: 168, gap: 14, padding: 28, headerH: 76, labelH: 48 };
  }
  if (count <= 200) {
    return { cols: 10, cardW: 100, cardH: 140, gap: 12, padding: 24, headerH: 72, labelH: 44 };
  }
  return { cols: 12, cardW: 88, cardH: 123, gap: 10, padding: 20, headerH: 68, labelH: 40 };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片解码失败'));
    img.src = dataUrl;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 0 && ctx.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

function drawQuantityBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cardW: number,
  quantity: number,
) {
  const label = `×${quantity}`;
  ctx.font = 'bold 13px "Microsoft YaHei", "PingFang SC", sans-serif';
  const textW = ctx.measureText(label).width;
  const badgeW = textW + 14;
  const badgeH = 22;
  const bx = x + cardW - badgeW - 6;
  const by = y + 6;

  roundRect(ctx, bx, by, badgeW, badgeH, 6);
  ctx.fillStyle = 'rgba(26, 23, 16, 0.92)';
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.gold;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + badgeW / 2, by + badgeH / 2 + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export async function renderCardListImage(options: {
  title: string;
  items: CardListExportItem[];
  fetchImage: (url: string) => Promise<string>;
}): Promise<string> {
  const { title, items, fetchImage } = options;
  if (items.length === 0) throw new Error('没有可导出的卡牌');

  const layout = pickLayout(items.length);
  const { cols, cardW, cardH, gap, padding, headerH, labelH } = layout;
  const rows = Math.ceil(items.length / cols);
  const gridW = cols * cardW + (cols - 1) * gap;
  const gridH = rows * (cardH + labelH + gap) - gap;
  const width = padding * 2 + gridW;
  const height = padding * 2 + headerH + gridH + 28;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建画布');

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const dateText = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 28px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText(title, padding, padding + 28);

  ctx.fillStyle = COLORS.muted;
  ctx.font = '14px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText(
    `${items.length} 种 · 共 ${totalQty} 张 · ${dateText}`,
    padding,
    padding + 54,
  );

  const imageCache = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    items.map(async (item) => {
      const url = item.img_url?.trim();
      if (!url || imageCache.has(url)) return;
      try {
        const dataUrl = await fetchImage(url);
        imageCache.set(url, await loadImage(dataUrl));
      } catch {
        imageCache.set(url, null);
      }
    }),
  );

  const startY = padding + headerH;

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = padding + col * (cardW + gap);
    const y = startY + row * (cardH + labelH + gap);

    roundRect(ctx, x, y, cardW, cardH, 8);
    ctx.save();
    ctx.clip();

    const img = item.img_url ? imageCache.get(item.img_url.trim()) : null;
    if (img) {
      ctx.drawImage(img, x, y, cardW, cardH);
    } else {
      ctx.fillStyle = COLORS.surface;
      ctx.fillRect(x, y, cardW, cardH);
      ctx.fillStyle = COLORS.muted;
      ctx.font = '12px "Microsoft YaHei", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('无卡图', x + cardW / 2, y + cardH / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    const gradient = ctx.createLinearGradient(x, y + cardH * 0.55, x, y + cardH);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, cardW, cardH);
    ctx.restore();

    roundRect(ctx, x, y, cardW, cardH, 8);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    drawQuantityBadge(ctx, x, y, cardW, item.quantity);

    const name = displayName(item);
    const cardNo = displayCardId(item);
    const variantLabel =
      item.variant !== 'normal' ? VARIANT_LABELS[item.variant] : '';

    ctx.fillStyle = COLORS.text;
    ctx.font = '13px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText(truncateText(ctx, name, cardW), x, y + cardH + 18);

    ctx.fillStyle = COLORS.muted;
    ctx.font = '11px "Microsoft YaHei", "PingFang SC", sans-serif';
    const sub = [cardNo, variantLabel].filter(Boolean).join(' · ');
    ctx.fillText(truncateText(ctx, sub, cardW), x, y + cardH + 36);
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = '11px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('SVE 小仓库', width - padding, height - padding / 2);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}
