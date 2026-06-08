import type { Rect, Point } from '../types';

export interface CropState {
  active: boolean;
  rect: Rect;
  aspectRatio?: number;
}

export class CropTool {
  private state: CropState = {
    active: false,
    rect: { x: 0, y: 0, width: 0, height: 0 },
  };

  start(x: number, y: number, aspectRatio?: number): void {
    this.state.active = true;
    this.state.rect = { x, y, width: 0, height: 0 };
    this.state.aspectRatio = aspectRatio;
  }

  update(x: number, y: number): Rect {
    if (!this.state.active) return this.state.rect;

    let width = x - this.state.rect.x;
    let height = y - this.state.rect.y;

    if (this.state.aspectRatio) {
      const ratio = this.state.aspectRatio;
      if (Math.abs(width) / ratio > Math.abs(height)) {
        height = width > 0 ? Math.abs(width) / ratio : -Math.abs(width) / ratio;
      } else {
        width = height > 0 ? Math.abs(height) * ratio : -Math.abs(height) * ratio;
      }
    }

    let rectX = this.state.rect.x;
    let rectY = this.state.rect.y;

    if (width < 0) {
      rectX = this.state.rect.x + width;
      width = Math.abs(width);
    }
    if (height < 0) {
      rectY = this.state.rect.y + height;
      height = Math.abs(height);
    }

    this.state.rect = {
      x: rectX,
      y: rectY,
      width,
      height,
    };

    return this.state.rect;
  }

  end(): Rect | null {
    if (!this.state.active) return null;
    this.state.active = false;
    return this.state.rect.width > 5 && this.state.rect.height > 5
      ? { ...this.state.rect }
      : null;
  }

  cancel(): void {
    this.state.active = false;
  }

  getState(): CropState {
    return {
      ...this.state,
      rect: { ...this.state.rect },
    };
  }

  setAspectRatio(ratio: number | undefined): void {
    this.state.aspectRatio = ratio;
  }

  reset(): void {
    this.state = {
      active: false,
      rect: { x: 0, y: 0, width: 0, height: 0 },
    };
  }

  applyToImage(
    imageData: ImageData,
    sourceWidth: number,
    sourceHeight: number,
  ): ImageData | null {
    const { rect } = this.state;
    if (rect.width <= 0 || rect.height <= 0) return null;

    const scaleX = imageData.width / sourceWidth;
    const scaleY = imageData.height / sourceHeight;

    const cropX = Math.max(0, Math.floor(rect.x * scaleX));
    const cropY = Math.max(0, Math.floor(rect.y * scaleY));
    const cropWidth = Math.min(imageData.width - cropX, Math.floor(rect.width * scaleX));
    const cropHeight = Math.min(imageData.height - cropY, Math.floor(rect.height * scaleY));

    const croppedData = new ImageData(cropWidth, cropHeight);

    for (let y = 0; y < cropHeight; y++) {
      for (let x = 0; x < cropWidth; x++) {
        const sourceIndex = ((cropY + y) * imageData.width + (cropX + x)) * 4;
        const destIndex = (y * cropWidth + x) * 4;
        croppedData.data[destIndex] = imageData.data[sourceIndex];
        croppedData.data[destIndex + 1] = imageData.data[sourceIndex + 1];
        croppedData.data[destIndex + 2] = imageData.data[sourceIndex + 2];
        croppedData.data[destIndex + 3] = imageData.data[sourceIndex + 3];
      }
    }

    return croppedData;
  }
}
