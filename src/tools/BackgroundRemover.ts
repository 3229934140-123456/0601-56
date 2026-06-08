export interface RemoveBackgroundOptions {
  threshold?: number;
  tolerance?: number;
  edgeSoftness?: number;
}

export class BackgroundRemover {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2d context');
    }
    this.ctx = ctx;
  }

  async removeByColor(
    imageSrc: string,
    targetColor: string,
    options: RemoveBackgroundOptions = {},
  ): Promise<string> {
    const img = await this.loadImage(imageSrc);
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.ctx.drawImage(img, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    const { r: tr, g: tg, b: tb } = this.hexToRgb(targetColor);
    const tolerance = options.tolerance ?? 30;
    const edgeSoftness = options.edgeSoftness ?? 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = Math.sqrt(
        Math.pow(r - tr, 2) + Math.pow(g - tg, 2) + Math.pow(b - tb, 2),
      );

      if (distance < tolerance) {
        data[i + 3] = 0;
      } else if (edgeSoftness > 0 && distance < tolerance + edgeSoftness) {
        const alpha = (distance - tolerance) / edgeSoftness;
        data[i + 3] = Math.round(alpha * 255);
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
    return this.canvas.toDataURL('image/png');
  }

  async removeWhiteBackground(imageSrc: string, options: RemoveBackgroundOptions = {}): Promise<string> {
    return this.removeByColor(imageSrc, '#ffffff', options);
  }

  async removeGreenScreen(imageSrc: string, options: RemoveBackgroundOptions = {}): Promise<string> {
    return this.removeByColor(imageSrc, '#00ff00', {
      tolerance: options.tolerance ?? 60,
      edgeSoftness: options.edgeSoftness ?? 10,
    });
  }

  async removeBackgroundSimple(imageSrc: string): Promise<string> {
    const img = await this.loadImage(imageSrc);
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.ctx.drawImage(img, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;

    const corners = [
      this.getPixelColor(data, 0, 0, width),
      this.getPixelColor(data, width - 1, 0, width),
      this.getPixelColor(data, 0, height - 1, width),
      this.getPixelColor(data, width - 1, height - 1, width),
    ];

    const avgColor = this.averageColors(corners);
    const tolerance = 40;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = Math.sqrt(
        Math.pow(r - avgColor.r, 2) + Math.pow(g - avgColor.g, 2) + Math.pow(b - avgColor.b, 2),
      );

      if (distance < tolerance) {
        data[i + 3] = 0;
      } else if (distance < tolerance + 20) {
        const alpha = (distance - tolerance) / 20;
        data[i + 3] = Math.round(alpha * 255);
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
    return this.canvas.toDataURL('image/png');
  }

  private getPixelColor(data: Uint8ClampedArray, x: number, y: number, width: number): { r: number; g: number; b: number } {
    const index = (y * width + x) * 4;
    return {
      r: data[index],
      g: data[index + 1],
      b: data[index + 2],
    };
  }

  private averageColors(colors: { r: number; g: number; b: number }[]): { r: number; g: number; b: number } {
    let r = 0;
    let g = 0;
    let b = 0;

    for (const color of colors) {
      r += color.r;
      g += color.g;
      b += color.b;
    }

    return {
      r: Math.round(r / colors.length),
      g: Math.round(g / colors.length),
      b: Math.round(b / colors.length),
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    return { r: 255, g: 255, b: 255 };
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

  destroy(): void {
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
