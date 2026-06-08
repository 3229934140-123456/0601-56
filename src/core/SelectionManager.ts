import type { Layer, Point, SnapOptions } from '../types';

export class SelectionManager {
  private selectedId: string | null = null;
  private layers: Layer[] = [];
  private snapOptions: SnapOptions = {
    enabled: true,
    snapToGrid: true,
    gridSize: 10,
    snapToGuides: true,
    snapToObjects: true,
    snapThreshold: 8,
  };

  private guides: { x?: number; y?: number }[] = [];

  setSnapOptions(options: Partial<SnapOptions>): void {
    this.snapOptions = { ...this.snapOptions, ...options };
  }

  getSnapOptions(): SnapOptions {
    return { ...this.snapOptions };
  }

  setLayers(layers: Layer[]): void {
    this.layers = [...layers];
  }

  updateLayer(layer: Layer): void {
    const index = this.layers.findIndex((l) => l.id === layer.id);
    if (index > -1) {
      this.layers[index] = { ...layer };
    } else {
      this.layers.push({ ...layer });
    }
  }

  removeLayer(id: string): void {
    const index = this.layers.findIndex((l) => l.id === id);
    if (index > -1) {
      this.layers.splice(index, 1);
    }
    if (this.selectedId === id) {
      this.selectedId = null;
    }
  }

  addLayer(layer: Layer): void {
    this.layers.push({ ...layer });
  }

  select(id: string | null): void {
    this.selectedId = id;
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  getSelectedLayer(): Layer | undefined {
    if (!this.selectedId) return undefined;
    return this.layers.find((l) => l.id === this.selectedId);
  }

  isSelected(id: string): boolean {
    return this.selectedId === id;
  }

  clearSelection(): void {
    this.selectedId = null;
  }

  snapPosition(x: number, y: number, layer: Layer): Point {
    if (!this.snapOptions.enabled) {
      return { x, y };
    }

    const candidatesX: number[] = [];
    const candidatesY: number[] = [];

    if (this.snapOptions.snapToGrid) {
      const gridSnapX = this.snapToGrid(x, this.snapOptions.gridSize);
      const gridSnapY = this.snapToGrid(y, this.snapOptions.gridSize);
      candidatesX.push(gridSnapX);
      candidatesY.push(gridSnapY);
    }

    if (this.snapOptions.snapToObjects) {
      const objectSnap = this.snapToObjects(x, y, layer);
      if (objectSnap.snappedX !== null) {
        candidatesX.push(objectSnap.snappedX);
      }
      if (objectSnap.snappedY !== null) {
        candidatesY.push(objectSnap.snappedY);
      }
    }

    if (this.snapOptions.snapToGuides && this.guides.length > 0) {
      const guideSnap = this.snapToGuides(x, y, layer);
      if (guideSnap.snappedX !== null) {
        candidatesX.push(guideSnap.snappedX);
      }
      if (guideSnap.snappedY !== null) {
        candidatesY.push(guideSnap.snappedY);
      }
    }

    const bestX = this.findClosest(x, candidatesX, this.snapOptions.snapThreshold);
    const bestY = this.findClosest(y, candidatesY, this.snapOptions.snapThreshold);

    return { x: bestX, y: bestY };
  }

  private findClosest(original: number, candidates: number[], threshold: number): number {
    let closest = original;
    let minDistance = threshold;

    for (const candidate of candidates) {
      const distance = Math.abs(candidate - original);
      if (distance < minDistance) {
        minDistance = distance;
        closest = candidate;
      }
    }

    return closest;
  }

  private snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
  }

  private snapToObjects(
    x: number,
    y: number,
    currentLayer: Layer,
  ): { snappedX: number | null; snappedY: number | null } {
    const threshold = this.snapOptions.snapThreshold;
    let bestSnapX: number | null = null;
    let bestSnapY: number | null = null;
    let minDistX = threshold;
    let minDistY = threshold;

    const otherLayers = this.layers.filter((l) => l.id !== currentLayer.id && l.visible);

    const currentW = currentLayer.width;
    const currentH = currentLayer.height;

    for (const layer of otherLayers) {
      const refLeft = layer.x;
      const refRight = layer.x + layer.width;
      const refTop = layer.y;
      const refBottom = layer.y + layer.height;
      const refCenterX = layer.x + layer.width / 2;
      const refCenterY = layer.y + layer.height / 2;

      const testLeft = x;
      const testRight = x + currentW;
      const testTop = y;
      const testBottom = y + currentH;
      const testCenterX = x + currentW / 2;
      const testCenterY = y + currentH / 2;

      const leftLeftDist = Math.abs(testLeft - refLeft);
      if (leftLeftDist < minDistX) {
        minDistX = leftLeftDist;
        bestSnapX = refLeft;
      }

      const leftRightDist = Math.abs(testLeft - refRight);
      if (leftRightDist < minDistX) {
        minDistX = leftRightDist;
        bestSnapX = refRight;
      }

      const rightLeftDist = Math.abs(testRight - refLeft);
      if (rightLeftDist < minDistX) {
        minDistX = rightLeftDist;
        bestSnapX = refLeft - currentW;
      }

      const rightRightDist = Math.abs(testRight - refRight);
      if (rightRightDist < minDistX) {
        minDistX = rightRightDist;
        bestSnapX = refRight - currentW;
      }

      const centerXDist = Math.abs(testCenterX - refCenterX);
      if (centerXDist < minDistX) {
        minDistX = centerXDist;
        bestSnapX = refCenterX - currentW / 2;
      }

      const topTopDist = Math.abs(testTop - refTop);
      if (topTopDist < minDistY) {
        minDistY = topTopDist;
        bestSnapY = refTop;
      }

      const topBottomDist = Math.abs(testTop - refBottom);
      if (topBottomDist < minDistY) {
        minDistY = topBottomDist;
        bestSnapY = refBottom;
      }

      const bottomTopDist = Math.abs(testBottom - refTop);
      if (bottomTopDist < minDistY) {
        minDistY = bottomTopDist;
        bestSnapY = refTop - currentH;
      }

      const bottomBottomDist = Math.abs(testBottom - refBottom);
      if (bottomBottomDist < minDistY) {
        minDistY = bottomBottomDist;
        bestSnapY = refBottom - currentH;
      }

      const centerYDist = Math.abs(testCenterY - refCenterY);
      if (centerYDist < minDistY) {
        minDistY = centerYDist;
        bestSnapY = refCenterY - currentH / 2;
      }
    }

    return { snappedX: bestSnapX, snappedY: bestSnapY };
  }

  private snapToGuides(
    x: number,
    y: number,
    currentLayer: Layer,
  ): { snappedX: number | null; snappedY: number | null } {
    const threshold = this.snapOptions.snapThreshold;
    let bestSnapX: number | null = null;
    let bestSnapY: number | null = null;
    let minDistX = threshold;
    let minDistY = threshold;

    const centerX = x + currentLayer.width / 2;
    const centerY = y + currentLayer.height / 2;

    for (const guide of this.guides) {
      if (guide.x !== undefined) {
        const leftDist = Math.abs(x - guide.x);
        const rightDist = Math.abs(x + currentLayer.width - guide.x);
        const centerDist = Math.abs(centerX - guide.x);

        if (leftDist < minDistX) {
          minDistX = leftDist;
          bestSnapX = guide.x;
        }
        if (rightDist < minDistX) {
          minDistX = rightDist;
          bestSnapX = guide.x - currentLayer.width;
        }
        if (centerDist < minDistX) {
          minDistX = centerDist;
          bestSnapX = guide.x - currentLayer.width / 2;
        }
      }

      if (guide.y !== undefined) {
        const topDist = Math.abs(y - guide.y);
        const bottomDist = Math.abs(y + currentLayer.height - guide.y);
        const centerDist = Math.abs(centerY - guide.y);

        if (topDist < minDistY) {
          minDistY = topDist;
          bestSnapY = guide.y;
        }
        if (bottomDist < minDistY) {
          minDistY = bottomDist;
          bestSnapY = guide.y - currentLayer.height;
        }
        if (centerDist < minDistY) {
          minDistY = centerDist;
          bestSnapY = guide.y - currentLayer.height / 2;
        }
      }
    }

    return { snappedX: bestSnapX, snappedY: bestSnapY };
  }

  addGuide(guide: { x?: number; y?: number }): void {
    this.guides.push(guide);
  }

  removeGuide(index: number): void {
    if (index >= 0 && index < this.guides.length) {
      this.guides.splice(index, 1);
    }
  }

  clearGuides(): void {
    this.guides = [];
  }

  getGuides(): { x?: number; y?: number }[] {
    return [...this.guides];
  }
}
