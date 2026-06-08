import type { ExportOptions, ThumbnailOptions, Layer, CanvasSettings, HistoryState } from '../types';
import { Renderer } from '../core/Renderer';

export class ExportManager {
  private renderer: Renderer | null = null;
  private exportCanvas: HTMLCanvasElement;
  private exportCtx: CanvasRenderingContext2D;

  constructor() {
    this.exportCanvas = document.createElement('canvas');
    const ctx = this.exportCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2d context');
    }
    this.exportCtx = ctx;
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

    this.exportCanvas.width = exportWidth;
    this.exportCanvas.height = exportHeight;
    this.exportCtx.clearRect(0, 0, exportWidth, exportHeight);

    const scaleX = exportWidth / canvasSettings.width;
    const scaleY = exportHeight / canvasSettings.height;

    if (includeBackground) {
      this.drawBackground(canvasSettings, exportWidth, exportHeight);
    }

    this.exportCtx.save();
    this.exportCtx.scale(scaleX, scaleY);

    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      await this.renderLayerToContext(layer, this.exportCtx);
    }

    this.exportCtx.restore();

    const mimeType = type === 'png' ? 'image/png' : type === 'jpeg' ? 'image/jpeg' : 'image/webp';
    return this.exportCanvas.toDataURL(mimeType, quality);
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
      canvas: canvasSettings,
      layers: layers.map((layer) => ({ ...layer })),
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

  private drawBackground(canvasSettings: CanvasSettings, width: number, height: number): void {
    const ctx = this.exportCtx;
    const bg = canvasSettings.background;

    switch (bg.type) {
      case 'color':
        ctx.fillStyle = bg.color || '#ffffff';
        ctx.fillRect(0, 0, width, height);
        break;
      case 'transparent':
        break;
      case 'gradient':
        if (bg.gradient) {
          let grad: CanvasGradient;
          if (bg.gradient.type === 'radial') {
            const cx = width / 2;
            const cy = height / 2;
            const r = Math.max(width, height) / 2;
            grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          } else {
            const angle = bg.gradient.angle || 0;
            const rad = (angle * Math.PI) / 180;
            const x1 = width / 2 - (Math.cos(rad) * width) / 2;
            const y1 = height / 2 - (Math.sin(rad) * height) / 2;
            const x2 = width / 2 + (Math.cos(rad) * width) / 2;
            const y2 = height / 2 + (Math.sin(rad) * height) / 2;
            grad = ctx.createLinearGradient(x1, y1, x2, y2);
          }
          bg.gradient.colors.forEach((color, index) => {
            grad.addColorStop(index / (bg.gradient!.colors.length - 1), color);
          });
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        }
        break;
    }
  }

  private async renderLayerToContext(layer: Layer, ctx: CanvasRenderingContext2D): Promise<void> {
    ctx.save();

    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    ctx.globalAlpha = layer.opacity;

    if (layer.blendMode) {
      ctx.globalCompositeOperation = layer.blendMode;
    }

    switch (layer.type) {
      case 'image':
        await this.drawImageLayer(layer, ctx);
        break;
      case 'text':
        this.drawTextLayer(layer, ctx);
        break;
      case 'shape':
        this.drawShapeLayer(layer, ctx);
        break;
      case 'icon':
        this.drawIconLayer(layer, ctx);
        break;
      case 'sticker':
        await this.drawStickerLayer(layer, ctx);
        break;
    }

    ctx.restore();
  }

  private async drawImageLayer(layer: any, ctx: CanvasRenderingContext2D): Promise<void> {
    const img = await this.loadImage(layer.src);

    if (layer.filter) {
      ctx.filter = this.buildFilterString(layer.filter);
    }

    if (layer.crop) {
      const cropX = layer.crop.x;
      const cropY = layer.crop.y;
      const cropW = layer.crop.width;
      const cropH = layer.crop.height;

      ctx.save();
      ctx.beginPath();
      ctx.rect(layer.x, layer.y, layer.width, layer.height);
      ctx.clip();

      const scaleX = layer.width / cropW;
      const scaleY = layer.height / cropH;
      const drawX = layer.x - cropX * scaleX;
      const drawY = layer.y - cropY * scaleY;
      const drawW = img.width * scaleX;
      const drawH = img.height * scaleY;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
    }

    ctx.filter = 'none';
  }

  private drawTextLayer(layer: any, ctx: CanvasRenderingContext2D): void {
    ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
    ctx.textAlign = layer.textAlign;
    ctx.textBaseline = 'top';

    const lines = layer.text.split('\n');
    const lineHeight = layer.fontSize * layer.lineHeight;

    lines.forEach((line: string, index: number) => {
      const y = layer.y + index * lineHeight;
      let x = layer.x;

      if (layer.textAlign === 'center') {
        x = layer.x + layer.width / 2;
      } else if (layer.textAlign === 'right') {
        x = layer.x + layer.width;
      }

      if (layer.strokeWidth > 0) {
        ctx.strokeStyle = layer.strokeColor;
        ctx.lineWidth = layer.strokeWidth;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, x, y);
      }

      ctx.fillStyle = layer.color;
      ctx.fillText(line, x, y);
    });
  }

  private drawShapeLayer(layer: any, ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height, shapeType, fill, stroke, strokeWidth, cornerRadius } = layer;

    ctx.beginPath();

    switch (shapeType) {
      case 'rect':
        if (cornerRadius && cornerRadius > 0) {
          const r = Math.min(cornerRadius, width / 2, height / 2);
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + width - r, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + r);
          ctx.lineTo(x + width, y + height - r);
          ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
          ctx.lineTo(x + r, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
        } else {
          ctx.rect(x, y, width, height);
        }
        break;
      case 'circle':
        ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
        break;
      case 'triangle':
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x, y + height);
        ctx.closePath();
        break;
    }

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }

    if (strokeWidth > 0 && stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  private drawIconLayer(layer: any, ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = layer.color;
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = layer.strokeWidth;

    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    const size = Math.min(layer.width, layer.height) / 2;

    switch (layer.iconName) {
      case 'heart':
        ctx.beginPath();
        ctx.moveTo(cx, cy + size * 0.3);
        ctx.bezierCurveTo(cx, cy - size * 0.3, cx - size, cy - size * 0.3, cx - size, cy + size * 0.1);
        ctx.bezierCurveTo(cx - size, cy + size * 0.6, cx, cy + size, cx, cy + size);
        ctx.bezierCurveTo(cx, cy + size, cx + size, cy + size * 0.6, cx + size, cy + size * 0.1);
        ctx.bezierCurveTo(cx + size, cy - size * 0.3, cx, cy - size * 0.3, cx, cy + size * 0.3);
        ctx.closePath();
        ctx.fill();
        break;
      case 'star':
        this.drawStar(ctx, cx, cy, 5, size, size / 2);
        ctx.fill();
        break;
      case 'check':
        ctx.beginPath();
        ctx.moveTo(layer.x + layer.width * 0.2, layer.y + layer.height * 0.5);
        ctx.lineTo(layer.x + layer.width * 0.45, layer.y + layer.height * 0.75);
        ctx.lineTo(layer.x + layer.width * 0.8, layer.y + layer.height * 0.25);
        ctx.stroke();
        break;
      case 'plus':
        ctx.beginPath();
        ctx.moveTo(cx - size, cy);
        ctx.lineTo(cx + size, cy);
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx, cy + size);
        ctx.stroke();
        break;
      case 'close':
        ctx.beginPath();
        ctx.moveTo(cx - size, cy - size);
        ctx.lineTo(cx + size, cy + size);
        ctx.moveTo(cx + size, cy - size);
        ctx.lineTo(cx - size, cy + size);
        ctx.stroke();
        break;
      default:
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number,
  ): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  private async drawStickerLayer(layer: any, ctx: CanvasRenderingContext2D): Promise<void> {
    const img = await this.loadImage(layer.src);
    ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
  }

  private buildFilterString(filter: any): string {
    const parts: string[] = [];

    if (filter.brightness !== undefined) parts.push(`brightness(${filter.brightness}%)`);
    if (filter.contrast !== undefined) parts.push(`contrast(${filter.contrast}%)`);
    if (filter.saturation !== undefined) parts.push(`saturate(${filter.saturation}%)`);
    if (filter.grayscale !== undefined) parts.push(`grayscale(${filter.grayscale}%)`);
    if (filter.sepia !== undefined) parts.push(`sepia(${filter.sepia}%)`);
    if (filter.blur !== undefined) parts.push(`blur(${filter.blur}px)`);
    if (filter.hueRotate !== undefined) parts.push(`hue-rotate(${filter.hueRotate}deg)`);
    if (filter.invert !== undefined) parts.push(`invert(${filter.invert}%)`);

    return parts.join(' ') || 'none';
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
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
    this.renderer = null;
  }
}
