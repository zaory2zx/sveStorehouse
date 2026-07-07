import { clipboard, dialog, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';

export async function fetchImageAsDataUrl(url: string): Promise<string> {
  if (!url?.trim()) throw new Error('图片地址为空');

  const response = await fetch(url, {
    headers: { 'User-Agent': 'SVE-Inventory/0.2' },
  });
  if (!response.ok) {
    throw new Error(`图片下载失败: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/png';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

export async function saveImageFromDataUrl(
  dataUrl: string,
  defaultName: string,
): Promise<{ saved: boolean; filePath?: string }> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '保存图片',
    defaultPath: defaultName.endsWith('.png') ? defaultName : `${defaultName}.png`,
    filters: [{ name: 'PNG 图片', extensions: ['png'] }],
  });

  if (canceled || !filePath) {
    return { saved: false };
  }

  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(path.normalize(filePath), Buffer.from(base64, 'base64'));
  return { saved: true, filePath };
}

export function copyImageFromDataUrl(dataUrl: string): void {
  const image = nativeImage.createFromDataURL(dataUrl);
  if (image.isEmpty()) {
    throw new Error('图片数据无效');
  }
  clipboard.writeImage(image);
}
