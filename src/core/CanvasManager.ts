import type { CanvasSettings, BackgroundSettings, Size } from '../types';

export class CanvasManager {
  private settings: CanvasSettings;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, options?: Partial<CanvasSettings>) {
    this.canvas = canvas;
    this.settings = {
      width: options?.width || 800,
      height: options?.height || 600,
      background: options?.background || {
        type: 'color',
        color: '#ffffff',
      },
      pixelRatio: options?.pixelRatio || window.devicePixelRatio || 1,
    };
    this.applyCanvasSize();
  }

  getSize(): Size {
    return {
      width: this.settings.width,
      height: this.settings.height,
    };
  }

  setSize(width: number, height: number): void {
    this.settings.width = width;
    this.settings.height = height;
    this.applyCanvasSize();
  }

  setWidth(width: number): void {
    this.settings.width = width;
    this.applyCanvasSize();
  }

  setHeight(height: number): void {
    this.settings.height = height;
    this.applyCanvasSize();
  }

  getSettings(): CanvasSettings {
    return { ...this.settings };
  }

  getBackground(): BackgroundSettings {
    return { ...this.settings.background };
  }

  setBackground(background: BackgroundSettings): void {
    this.settings.background = { ...background };
  }

  setBackgroundColor(color: string): void {
    this.settings.background = {
      type: 'color',
      color,
    };
  }

  setBackgroundImage(src: string): void {
    this.settings.background = {
      type: 'image',
      image: src,
    };
  }

  setBackgroundGradient(
    type: 'linear' | 'radial',
    colors: string[],
    angle?: number,
  ): void {
    this.settings.background = {
      type: 'gradient',
      gradient: {
        type,
        colors,
        angle,
      },
    };
  }

  setBackgroundTransparent(): void {
    this.settings.background = {
      type: 'transparent',
    };
  }

  getPixelRatio(): number {
    return this.settings.pixelRatio || 1;
  }

  setPixelRatio(ratio: number): void {
    this.settings.pixelRatio = ratio;
    this.applyCanvasSize();
  }

  resize(width: number, height: number, keepContent?: boolean): Size {
    const oldWidth = this.settings.width;
    const oldHeight = this.settings.height;
    this.settings.width = width;
    this.settings.height = height;
    this.applyCanvasSize();

    if (keepContent) {
      return { width: oldWidth, height: oldHeight };
    }

    return { width, height };
  }

  scale(factor: number): Size {
    const newWidth = Math.round(this.settings.width * factor);
    const newHeight = Math.round(this.settings.height * factor);
    this.settings.width = newWidth;
    this.settings.height = newHeight;
    this.applyCanvasSize();
    return { width: newWidth, height: newHeight };
  }

  getAspectRatio(): number {
    return this.settings.width / this.settings.height;
  }

  private applyCanvasSize(): void {
    const pixelRatio = this.settings.pixelRatio || 1;
    this.canvas.width = this.settings.width * pixelRatio;
    this.canvas.height = this.settings.height * pixelRatio;
    this.canvas.style.width = `${this.settings.width}px`;
    this.canvas.style.height = `${this.settings.height}px`;

    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
