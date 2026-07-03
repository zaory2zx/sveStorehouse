import { ImageDown } from 'lucide-react';
import { useState } from 'react';
import {
  CardListExportItem,
  renderCardListImage,
} from '../lib/exportCardGrid';

interface ExportImageButtonProps {
  title: string;
  filenamePrefix: string;
  loadItems: () => Promise<CardListExportItem[]>;
  disabled?: boolean;
}

export function ExportImageButton({
  title,
  filenamePrefix,
  loadItems,
  disabled = false,
}: ExportImageButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const items = await loadItems();
      if (items.length === 0) {
        alert('没有可导出的卡牌');
        return;
      }

      const dataUrl = await renderCardListImage({
        title,
        items,
        fetchImage: (url) => window.sveApi.fetchImageDataUrl(url),
      });

      const date = new Date().toISOString().slice(0, 10);
      const result = await window.sveApi.saveImage(
        dataUrl,
        `${filenamePrefix}_${date}.png`,
      );

      if (result.saved && result.filePath) {
        alert(`已保存至\n${result.filePath}`);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      className="btn-secondary flex shrink-0 items-center gap-2 text-sm"
      onClick={handleExport}
      disabled={disabled || exporting}
    >
      <ImageDown size={16} className={exporting ? 'animate-pulse' : ''} />
      {exporting ? '导出中…' : '导出图片'}
    </button>
  );
}
