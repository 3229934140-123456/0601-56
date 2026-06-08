import type {
  Layer,
  ImageLayer,
  TextLayer,
  ShapeLayer,
  IconLayer,
  StickerLayer,
  BackgroundSettings,
  FilterSettings,
} from '../types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2d context');
    }
    this.ctx = ctx;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderBackground(background: BackgroundSettings): void {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    ctx.save();

    switch (background.type) {
      case 'transparent':
        this.drawTransparentPattern(width, height);
        break;
      case 'color':
        ctx.fillStyle = background.color || '#ffffff';
        ctx.fillRect(0, 0, width, height);
        break;
      case 'image':
        if (background.image) {
          this.drawBackgroundImage(background.image, width, height);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        break;
      case 'gradient':
        if (background.gradient) {
          this.drawGradient(background.gradient, width, height);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        break;
    }

    ctx.restore();
  }

  private drawTransparentPattern(width: number, height: number): void {
    const ctx = this.ctx;
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
    try {
      const img = await this.loadImage(src);
      const scale = Math.max(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;
      this.ctx.drawImage(img, x, y, w, h);
    } catch {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawGradient(
    gradient: { type: 'linear' | 'radial'; colors: string[]; angle?: number },
    width: number,
    height: number,
  ): void {
    const ctx = this.ctx;
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

  async renderLayer(layer: Layer): Promise<void> {
    if (!layer.visible) return;

    const ctx = this.ctx;
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

    try {
      switch (layer.type) {
        case 'image':
          await this.renderImageLayer(layer);
          break;
        case 'text':
          this.renderTextLayer(layer);
          break;
        case 'shape':
          this.renderShapeLayer(layer);
          break;
        case 'icon':
          await this.renderIconLayer(layer);
          break;
        case 'sticker':
          await this.renderStickerLayer(layer);
          break;
      }
    } catch (e) {
      console.error('[Renderer] Error rendering layer:', layer.id, e);
    }

    ctx.restore();
  }

  private async renderImageLayer(layer: ImageLayer): Promise<void> {
    const ctx = this.ctx;
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

  private renderTextLayer(layer: TextLayer): void {
    const ctx = this.ctx;

    ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
    ctx.textAlign = layer.textAlign;
    ctx.textBaseline = 'top';

    const lines = layer.text.split('\n');
    const lineHeight = layer.fontSize * layer.lineHeight;
    const totalHeight = lines.length * lineHeight;

    let startY = layer.y;

    if (layer.curved && layer.curveRadius) {
      this.renderCurvedText(layer, lines, lineHeight);
      return;
    }

    lines.forEach((line, index) => {
      const y = startY + index * lineHeight;
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

  private renderCurvedText(layer: TextLayer, lines: string[], lineHeight: number): void {
    const ctx = this.ctx;
    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    const radius = layer.curveRadius || 100;
    const startAngle = -Math.PI / 2 + (layer.curveAngle || 0) * (Math.PI / 180);

    const text = lines[0] || '';
    const charSpacing = layer.letterSpacing || 0;

    ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;

    let totalAngle = 0;
    const charAngles: number[] = [];

    for (let i = 0; i < text.length; i++) {
      const charWidth = ctx.measureText(text[i]).width + charSpacing;
      const angle = charWidth / radius;
      charAngles.push(angle);
      totalAngle += angle;
    }

    let currentAngle = startAngle - totalAngle / 2;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charAngle = charAngles[i];

      ctx.save();
      ctx.translate(
        centerX + radius * Math.cos(currentAngle + charAngle / 2),
        centerY + radius * Math.sin(currentAngle + charAngle / 2),
      );
      ctx.rotate(currentAngle + charAngle / 2 + Math.PI / 2);

      if (layer.strokeWidth > 0) {
        ctx.strokeStyle = layer.strokeColor;
        ctx.lineWidth = layer.strokeWidth;
        ctx.strokeText(char, 0, 0);
      }

      ctx.fillStyle = layer.color;
      ctx.fillText(char, 0, 0);

      ctx.restore();
      currentAngle += charAngle;
    }
  }

  private renderShapeLayer(layer: ShapeLayer): void {
    const ctx = this.ctx;
    const { x, y, width, height, shapeType, fill, stroke, strokeWidth, cornerRadius } = layer;

    ctx.beginPath();

    switch (shapeType) {
      case 'rect':
        if (cornerRadius && cornerRadius > 0) {
          this.roundRect(ctx, x, y, width, height, cornerRadius);
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
      case 'star':
        this.drawStar(ctx, x + width / 2, y + height / 2, 5, Math.min(width, height) / 2, Math.min(width, height) / 4);
        break;
      case 'line':
        ctx.moveTo(x, y + height / 2);
        ctx.lineTo(x + width, y + height / 2);
        break;
      case 'arrow':
        this.drawArrow(ctx, x, y + height / 2, x + width, y + height / 2, height / 2);
        break;
    }

    if (fill && shapeType !== 'line') {
      ctx.fillStyle = fill;
      ctx.fill();
    }

    if (strokeWidth > 0 && stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
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

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    headSize: number,
  ): void {
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);

    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headSize * Math.cos(angle - Math.PI / 6),
      toY - headSize * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headSize * Math.cos(angle + Math.PI / 6),
      toY - headSize * Math.sin(angle + Math.PI / 6),
    );
  }

  private async renderIconLayer(layer: IconLayer): Promise<void> {
    const ctx = this.ctx;
    ctx.fillStyle = layer.color;
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = layer.strokeWidth;

    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    const size = Math.min(layer.width, layer.height) / 2;

    switch (layer.iconName) {
      case 'heart':
        this.drawHeart(ctx, cx, cy, size);
        ctx.fill();
        break;
      case 'star':
        this.drawStar(ctx, cx, cy, 5, size, size / 2);
        ctx.fill();
        break;
      case 'check':
        this.drawCheck(ctx, layer.x, layer.y, layer.width, layer.height);
        break;
      case 'plus':
        this.drawPlus(ctx, cx, cy, size);
        break;
      case 'close':
        this.drawClose(ctx, cx, cy, size);
        break;
      default:
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.3);
    ctx.bezierCurveTo(cx, cy - size * 0.3, cx - size, cy - size * 0.3, cx - size, cy + size * 0.1);
    ctx.bezierCurveTo(cx - size, cy + size * 0.6, cx, cy + size, cx, cy + size);
    ctx.bezierCurveTo(cx, cy + size, cx + size, cy + size * 0.6, cx + size, cy + size * 0.1);
    ctx.bezierCurveTo(cx + size, cy - size * 0.3, cx, cy - size * 0.3, cx, cy + size * 0.3);
    ctx.closePath();
  }

  private drawCheck(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + width * 0.2, y + height * 0.5);
    ctx.lineTo(x + width * 0.45, y + height * 0.75);
    ctx.lineTo(x + width * 0.8, y + height * 0.25);
    ctx.stroke();
  }

  private drawPlus(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    ctx.beginPath();
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx + size, cy);
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx, cy + size);
    ctx.stroke();
  }

  private drawClose(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    ctx.beginPath();
    ctx.moveTo(cx - size, cy - size);
    ctx.lineTo(cx + size, cy + size);
    ctx.moveTo(cx + size, cy - size);
    ctx.lineTo(cx - size, cy + size);
    ctx.stroke();
  }

  private async renderStickerLayer(layer: StickerLayer): Promise<void> {
    const img = await this.loadImage(layer.src);
    this.ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
  }

  private buildFilterString(filter: FilterSettings): string {
    const parts: string[] = [];

    if (filter.brightness !== undefined) {
      parts.push(`brightness(${filter.brightness}%)`);
    }
    if (filter.contrast !== undefined) {
      parts.push(`contrast(${filter.contrast}%)`);
    }
    if (filter.saturation !== undefined) {
      parts.push(`saturate(${filter.saturation}%)`);
    }
    if (filter.grayscale !== undefined) {
      parts.push(`grayscale(${filter.grayscale}%)`);
    }
    if (filter.sepia !== undefined) {
      parts.push(`sepia(${filter.sepia}%)`);
    }
    if (filter.blur !== undefined) {
      parts.push(`blur(${filter.blur}px)`);
    }
    if (filter.hueRotate !== undefined) {
      parts.push(`hue-rotate(${filter.hueRotate}deg)`);
    }
    if (filter.invert !== undefined) {
      parts.push(`invert(${filter.invert}%)`);
    }

    return parts.join(' ') || 'none';
  }

  async loadImage(src: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(src)) {
      return this.imageCache.get(src)!;
    }

    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(src, img);
        this.loadingPromises.delete(src);
        resolve(img);
      };
      img.onerror = (e) => {
        this.loadingPromises.delete(src);
        reject(e);
      };
      img.src = src;
    });

    this.loadingPromises.set(src, promise);
    return promise;
  }

  clearCache(): void {
    this.imageCache.clear();
  }

  destroy(): void {
    this.clearCache();
    this.loadingPromises.clear();
  }
}
