import { ClipboardCopy, ImageDown, Save } from 'lucide-react';
import { useState } from 'react';
import {
  CardListExportItem,
  renderCardListImage,
} from '../lib/exportCardGrid';
import { Modal } from './Modal';

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [defaultFilename, setDefaultFilename] = useState('');
  const [copying, setCopying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewDataUrl(null);
    setStatusMsg('');
  };

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
      setDefaultFilename(`${filenamePrefix}_${date}.png`);
      setPreviewDataUrl(dataUrl);
      setStatusMsg('');
      setPreviewOpen(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!previewDataUrl) return;
    setCopying(true);
    setStatusMsg('');
    try {
      await window.sveApi.copyImage(previewDataUrl);
      setStatusMsg('已复制到剪贴板');
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : '复制失败');
    } finally {
      setCopying(false);
    }
  };

  const handleSave = async () => {
    if (!previewDataUrl) return;
    setSaving(true);
    setStatusMsg('');
    try {
      const result = await window.sveApi.saveImage(
        previewDataUrl,
        defaultFilename,
      );
      if (result.saved && result.filePath) {
        setStatusMsg(`已保存至 ${result.filePath}`);
      }
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn-secondary flex shrink-0 items-center gap-2 text-sm"
        onClick={handleExport}
        disabled={disabled || exporting}
      >
        <ImageDown size={16} className={exporting ? 'animate-pulse' : ''} />
        {exporting ? '生成中…' : '导出图片'}
      </button>

      <Modal
        open={previewOpen}
        onClose={closePreview}
        title="导出预览"
        width="max-w-5xl"
      >
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-sve-border bg-black/40">
          {previewDataUrl && (
            <img
              src={previewDataUrl}
              alt="导出预览"
              className="mx-auto block w-full"
            />
          )}
        </div>

        {statusMsg && (
          <p
            className={`mt-3 text-sm ${
              statusMsg.startsWith('已')
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {statusMsg}
          </p>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={closePreview}
          >
            关闭
          </button>
          <button
            type="button"
            className="btn-secondary flex items-center gap-2"
            onClick={handleCopy}
            disabled={copying || saving}
          >
            <ClipboardCopy size={16} />
            {copying ? '复制中…' : '复制到剪贴板'}
          </button>
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={handleSave}
            disabled={copying || saving}
          >
            <Save size={16} />
            {saving ? '保存中…' : '另存为'}
          </button>
        </div>
      </Modal>
    </>
  );
}
