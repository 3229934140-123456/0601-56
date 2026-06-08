import type { ColorPanelConfig } from '../types';

const defaultPresets = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff',
  '#0088ff', '#00ff88', '#ff8888', '#88ff88', '#8888ff',
  '#888888', '#cccccc', '#eeeeee', '#8b4513', '#228b22',
];

export class ColorPanel {
  private config: ColorPanelConfig;

  constructor(customConfig?: Partial<ColorPanelConfig>) {
    this.config = {
      presets: defaultPresets,
      recentColors: [],
      allowCustom: true,
      allowOpacity: true,
      ...customConfig,
    };
  }

  getPresets(): string[] {
    return [...this.config.presets];
  }

  setPresets(colors: string[]): void {
    this.config.presets = [...colors];
  }

  getRecentColors(): string[] {
    return [...this.config.recentColors];
  }

  addRecentColor(color: string): void {
    const hexColor = this.normalizeColor(color);
    const index = this.config.recentColors.indexOf(hexColor);
    if (index > -1) {
      this.config.recentColors.splice(index, 1);
    }
    this.config.recentColors.unshift(hexColor);
    if (this.config.recentColors.length > 20) {
      this.config.recentColors.pop();
    }
  }

  clearRecentColors(): void {
    this.config.recentColors = [];
  }

  isAllowCustom(): boolean {
    return this.config.allowCustom;
  }

  setAllowCustom(allow: boolean): void {
    this.config.allowCustom = allow;
  }

  isAllowOpacity(): boolean {
    return this.config.allowOpacity;
  }

  setAllowOpacity(allow: boolean): void {
    this.config.allowOpacity = allow;
  }

  getConfig(): ColorPanelConfig {
    return {
      ...this.config,
      presets: [...this.config.presets],
      recentColors: [...this.config.recentColors],
    };
  }

  parseColor(color: string): { r: number; g: number; b: number; a: number } {
    if (color.startsWith('#')) {
      return this.hexToRgba(color);
    }
    if (color.startsWith('rgb(') || color.startsWith('rgba(')) {
      return this.parseRgba(color);
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  private hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
    let h = hex.replace('#', '');

    if (h.length === 3) {
      h = h.split('').map((c) => c + c).join('');
    }

    if (h.length === 6) {
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return { r, g, b, a: 1 };
    }

    if (h.length === 8) {
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      const a = parseInt(h.substring(6, 8), 16) / 255;
      return { r, g, b, a };
    }

    return { r: 0, g: 0, b: 0, a: 1 };
  }

  private parseRgba(str: string): { r: number; g: number; b: number; a: number } {
    const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] ? parseFloat(match[4]) : 1,
      };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  toHex(r: number, g: number, b: number, a: number = 1): string {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    if (a < 1) {
      return hex + toHex(a * 255);
    }
    return hex;
  }

  private normalizeColor(color: string): string {
    const { r, g, b, a } = this.parseColor(color);
    return this.toHex(r, g, b, a);
  }

  mixColors(color1: string, color2: string, ratio: number = 0.5): string {
    const c1 = this.parseColor(color1);
    const c2 = this.parseColor(color2);
    const r = c1.r * (1 - ratio) + c2.r * ratio;
    const g = c1.g * (1 - ratio) + c2.g * ratio;
    const b = c1.b * (1 - ratio) + c2.b * ratio;
    const a = c1.a * (1 - ratio) + c2.a * ratio;
    return this.toHex(r, g, b, a);
  }

  lighten(color: string, amount: number): string {
    const { r, g, b, a } = this.parseColor(color);
    return this.toHex(
      Math.min(255, r + 255 * amount),
      Math.min(255, g + 255 * amount),
      Math.min(255, b + 255 * amount),
      a,
    );
  }

  darken(color: string, amount: number): string {
    const { r, g, b, a } = this.parseColor(color);
    return this.toHex(
      Math.max(0, r - 255 * amount),
      Math.max(0, g - 255 * amount),
      Math.max(0, b - 255 * amount),
      a,
    );
  }

  generateGradientColors(startColor: string, endColor: string, steps: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < steps; i++) {
      colors.push(this.mixColors(startColor, endColor, i / (steps - 1)));
    }
    return colors;
  }
}
