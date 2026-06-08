import type { ExportOptions, ThumbnailOptions, Layer, CanvasSettings, HistoryState } from '../types';
import { Renderer } from './Renderer';

export class ExportManager {
  private renderer: Renderer | null = null;
  private exportCanvas: HTMLCanvasElement;
  private exportRenderer: Renderer;

  constructor() {
    this.exportCanvas = document.createElement('canvas');
    this.exportRenderer = new Renderer(this.exportCanvas);
  }

  setRenderer(renderer: Renderer): void {
    this.renderer = renderer;
  }

  async exportImage(
    layers: Layer[],
    canvasSettings: CanvasSettings,
    options: ExportOptions = {},
  ): Promise<string> {
    const {
      type = 'png',
      quality = 0.92,
      scale = 1,
      width,
      height,
      includeBackground = true,
    } = options;

    let exportWidth = width || canvasSettings.width * scale;
    let exportHeight = height || canvasSettings.height * scale;

    if (width && !height) {
      exportHeight = (canvasSettings.height / canvasSettings.width) * width;
    }
    if (height && !width) {
      exportWidth = (canvasSettings.width / canvasSettings.height) * height;
    }

    exportWidth = Math.round(exportWidth);
    exportHeight = Math.round(exportHeight);

    this.exportCanvas.width = exportWidth;
    this.exportCanvas.height = exportHeight;
    this.exportCanvas.style.width = exportWidth + 'px';
    this.exportCanvas.style.height = exportHeight + 'px';

    const ctx = this.exportRenderer.getContext();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const scaleX = exportWidth / canvasSettings.width;
    const scaleY = exportHeight / canvasSettings.height;

    ctx.clearRect(0, 0, exportWidth, exportHeight);

    if (includeBackground) {
      await this.renderBackgroundScaled(canvasSettings, scaleX, scaleY, exportWidth, exportHeight);
    }

    ctx.save();
    ctx.scale(scaleX, scaleY);

    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      await this.exportRenderer.renderLayer(layer);
    }

    ctx.restore();

    const mimeType = type === 'png' ? 'image/png' : type === 'jpeg' ? 'image/jpeg' : 'image/webp';
    return this.exportCanvas.toDataURL(mimeType, quality);
  }

  private async renderBackgroundScaled(
    canvasSettings: CanvasSettings,
    scaleX: number,
    scaleY: number,
    exportWidth: number,
    exportHeight: number,
  ): Promise<void> {
    const ctx = this.exportRenderer.getContext();
    const bg = canvasSettings.background;

    ctx.save();

    switch (bg.type) {
      case 'transparent':
        this.drawTransparentPattern(exportWidth, exportHeight);
        break;
      case 'color':
        ctx.fillStyle = bg.color || '#ffffff';
        ctx.fillRect(0, 0, exportWidth, exportHeight);
        break;
      case 'image':
        if (bg.image) {
          await this.drawBackgroundImage(bg.image, exportWidth, exportHeight);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, exportWidth, exportHeight);
        }
        break;
      case 'gradient':
        if (bg.gradient) {
          this.drawGradient(bg.gradient, exportWidth, exportHeight);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, exportWidth, exportHeight);
        }
        break;
    }

    ctx.restore();
  }

  private drawTransparentPattern(width: number, height: number): void {
    const ctx = this.exportRenderer.getContext();
    const size = 10;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f0f0f0';
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        if ((x / size + y / size) % 2 === 0) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  }

  private async drawBackgroundImage(src: string, width: number, height: number): Promise<void> {
    const ctx = this.exportRenderer.getContext();
    try {
      const img = await this.exportRenderer.loadImage(src);
      const scale = Math.max(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
    } catch {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
  }

  private drawGradient(
    gradient: { type: 'linear' | 'radial'; colors: string[]; angle?: number },
    width: number,
    height: number,
  ): void {
    const ctx = this.exportRenderer.getContext();
    let grad: CanvasGradient;

    if (gradient.type === 'radial') {
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.max(width, height) / 2;
      grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    } else {
      const angle = gradient.angle || 0;
      const rad = (angle * Math.PI) / 180;
      const x1 = width / 2 - (Math.cos(rad) * width) / 2;
      const y1 = height / 2 - (Math.sin(rad) * height) / 2;
      const x2 = width / 2 + (Math.cos(rad) * width) / 2;
      const y2 = height / 2 + (Math.sin(rad) * height) / 2;
      grad = ctx.createLinearGradient(x1, y1, x2, y2);
    }

    gradient.colors.forEach((color, index) => {
      grad.addColorStop(index / (gradient.colors.length - 1), color);
    });

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  async exportToBlob(
    layers: Layer[],
    canvasSettings: CanvasSettings,
    options: ExportOptions = {},
  ): Promise<Blob> {
    const dataUrl = await this.exportImage(layers, canvasSettings, options);
    return this.dataUrlToBlob(dataUrl);
  }

  async generateThumbnail(
    layers: Layer[],
    canvasSettings: CanvasSettings,
    options: ThumbnailOptions,
  ): Promise<string> {
    const { maxWidth, maxHeight, type = 'png', quality = 0.8 } = options;

    const aspectRatio = canvasSettings.width / canvasSettings.height;
    let thumbWidth = maxWidth;
    let thumbHeight = maxWidth / aspectRatio;

    if (thumbHeight > maxHeight) {
      thumbHeight = maxHeight;
      thumbWidth = maxHeight * aspectRatio;
    }

    return this.exportImage(layers, canvasSettings, {
      type,
      quality,
      width: Math.round(thumbWidth),
      height: Math.round(thumbHeight),
    });
  }

  async generateThumbnailBlob(
    layers: Layer[],
    canvasSettings: CanvasSettings,
    options: ThumbnailOptions,
  ): Promise<Blob> {
    const dataUrl = await this.generateThumbnail(layers, canvasSettings, options);
    return this.dataUrlToBlob(dataUrl);
  }

  async exportMultiResolution(
    layers: Layer[],
    canvasSettings: CanvasSettings,
    scales: number[],
    options: Omit<ExportOptions, 'scale' | 'width' | 'height'> = {},
  ): Promise<{ scale: number; dataUrl: string }[]> {
    const results: { scale: number; dataUrl: string }[] = [];

    for (const scale of scales) {
      const dataUrl = await this.exportImage(layers, canvasSettings, {
        ...options,
        scale,
      });
      results.push({ scale, dataUrl });
    }

    return results;
  }

  serializeState(layers: Layer[], canvasSettings: CanvasSettings): string {
    const state = {
      version: '1.0',
      timestamp: Date.now(),
      canvas: JSON.parse(JSON.stringify(canvasSettings)),
      layers: JSON.parse(JSON.stringify(layers)),
    };
    return JSON.stringify(state);
  }

  deserializeState(json: string): { layers: Layer[]; canvas: CanvasSettings } | null {
    try {
      const state = JSON.parse(json);
      if (!state.canvas || !Array.isArray(state.layers)) {
        return null;
      }
      return {
        layers: state.layers,
        canvas: state.canvas,
      };
    } catch (e) {
      console.error('[ExportManager] Failed to deserialize state:', e);
      return null;
    }
  }

  saveStateToLocalStorage(key: string, layers: Layer[], canvasSettings: CanvasSettings): void {
    const json = this.serializeState(layers, canvasSettings);
    try {
      localStorage.setItem(key, json);
    } catch (e) {
      console.error('[ExportManager] Failed to save to localStorage:', e);
    }
  }

  loadStateFromLocalStorage(key: string): { layers: Layer[]; canvas: CanvasSettings } | null {
    try {
      const json = localStorage.getItem(key);
      if (!json) return null;
      return this.deserializeState(json);
    } catch (e) {
      console.error('[ExportManager] Failed to load from localStorage:', e);
      return null;
    }
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  destroy(): void {
    this.exportCanvas.width = 0;
    this.exportCanvas.height = 0;
    this.exportRenderer.destroy();
    this.renderer = null;
  }
}
