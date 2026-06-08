import type { FilterSettings } from '../types';

export const defaultFilterSettings: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
  hueRotate: 0,
  invert: 0,
};

export const presetFilters: Record<string, FilterSettings> = {
  original: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    hueRotate: 0,
    invert: 0,
  },
  grayscale: {
    brightness: 100,
    contrast: 100,
    saturation: 0,
    grayscale: 100,
    sepia: 0,
    blur: 0,
    hueRotate: 0,
    invert: 0,
  },
  sepia: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    sepia: 100,
    blur: 0,
    hueRotate: 0,
    invert: 0,
  },
  vintage: {
    brightness: 110,
    contrast: 90,
    saturation: 80,
    grayscale: 0,
    sepia: 30,
    blur: 0,
    hueRotate: 0,
    invert: 0,
  },
  warm: {
    brightness: 105,
    contrast: 105,
    saturation: 120,
    grayscale: 0,
    sepia: 20,
    blur: 0,
    hueRotate: -10,
    invert: 0,
  },
  cool: {
    brightness: 100,
    contrast: 110,
    saturation: 90,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    hueRotate: 180,
    invert: 0,
  },
  dramatic: {
    brightness: 90,
    contrast: 130,
    saturation: 120,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    hueRotate: 0,
    invert: 0,
  },
  bright: {
    brightness: 130,
    contrast: 110,
    saturation: 110,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    hueRotate: 0,
    invert: 0,
  },
  dark: {
    brightness: 70,
    contrast: 120,
    saturation: 80,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    hueRotate: 0,
    invert: 0,
  },
  invert: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    hueRotate: 0,
    invert: 100,
  },
};

export class FilterManager {
  private settings: FilterSettings = { ...defaultFilterSettings };

  setSettings(settings: Partial<FilterSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  getSettings(): FilterSettings {
    return { ...this.settings };
  }

  applyPreset(presetName: string): FilterSettings | null {
    const preset = presetFilters[presetName];
    if (preset) {
      this.settings = { ...preset };
      return { ...preset };
    }
    return null;
  }

  reset(): void {
    this.settings = { ...defaultFilterSettings };
  }

  setBrightness(value: number): void {
    this.settings.brightness = Math.max(0, Math.min(200, value));
  }

  setContrast(value: number): void {
    this.settings.contrast = Math.max(0, Math.min(200, value));
  }

  setSaturation(value: number): void {
    this.settings.saturation = Math.max(0, Math.min(200, value));
  }

  setGrayscale(value: number): void {
    this.settings.grayscale = Math.max(0, Math.min(100, value));
  }

  setSepia(value: number): void {
    this.settings.sepia = Math.max(0, Math.min(100, value));
  }

  setBlur(value: number): void {
    this.settings.blur = Math.max(0, Math.min(20, value));
  }

  setHueRotate(value: number): void {
    this.settings.hueRotate = value;
  }

  setInvert(value: number): void {
    this.settings.invert = Math.max(0, Math.min(100, value));
  }

  getPresetNames(): string[] {
    return Object.keys(presetFilters);
  }

  getPreset(name: string): FilterSettings | undefined {
    return presetFilters[name] ? { ...presetFilters[name] } : undefined;
  }

  applyToImage(imageData: ImageData): ImageData {
    const data = imageData.data;
    const { brightness = 100, contrast = 100, saturation = 100, grayscale = 0, sepia = 0, invert = 0 } = this.settings;

    const brightnessFactor = brightness / 100;
    const contrastFactor = (contrast / 100) * 2;
    const saturationFactor = saturation / 100;
    const grayscaleFactor = grayscale / 100;
    const sepiaFactor = sepia / 100;
    const invertFactor = invert / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (invertFactor > 0) {
        r = r * (1 - invertFactor) + (255 - r) * invertFactor;
        g = g * (1 - invertFactor) + (255 - g) * invertFactor;
        b = b * (1 - invertFactor) + (255 - b) * invertFactor;
      }

      r = (r - 128) * contrastFactor + 128;
      g = (g - 128) * contrastFactor + 128;
      b = (b - 128) * contrastFactor + 128;

      r *= brightnessFactor;
      g *= brightnessFactor;
      b *= brightnessFactor;

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = r * (1 - grayscaleFactor) + gray * grayscaleFactor;
      g = g * (1 - grayscaleFactor) + gray * grayscaleFactor;
      b = b * (1 - grayscaleFactor) + gray * grayscaleFactor;

      const sr = r * (1 - saturationFactor) + gray * saturationFactor;
      const sg = g * (1 - saturationFactor) + gray * saturationFactor;
      const sb = b * (1 - saturationFactor) + gray * saturationFactor;
      r = r + (r - sr);
      g = g + (g - sg);
      b = b + (b - sb);

      const tr = 0.393 * r + 0.769 * g + 0.189 * b;
      const tg = 0.349 * r + 0.686 * g + 0.168 * b;
      const tb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = r * (1 - sepiaFactor) + tr * sepiaFactor;
      g = g * (1 - sepiaFactor) + tg * sepiaFactor;
      b = b * (1 - sepiaFactor) + tb * sepiaFactor;

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    return imageData;
  }
}
