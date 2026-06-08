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
    snapThreshold: 5,
  };

  private guides: { x?: number; y?: number }[] = [];

  setSnapOptions(options: Partial<SnapOptions>): void {
    this.snapOptions = { ...this.snapOptions, ...options };
  }

  getSnapOptions(): SnapOptions {
    return { ...this.snapOptions };
  }

  setLayers(layers: Layer[]): void {
    this.layers = layers;
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

  snapPosition(x: number, y: number, layer?: Layer): Point {
    if (!this.snapOptions.enabled) {
      return { x, y };
    }

    let snappedX = x;
    let snappedY = y;

    if (this.snapOptions.snapToGrid) {
      snappedX = this.snapToGrid(x, this.snapOptions.gridSize);
      snappedY = this.snapToGrid(y, this.snapOptions.gridSize);
    }

    if (this.snapOptions.snapToObjects && layer) {
      const snapResult = this.snapToObjects(x, y, layer);
      snappedX = snapResult.x;
      snappedY = snapResult.y;
    }

    return { x: snappedX, y: snappedY };
  }

  private snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
  }

  private snapToObjects(x: number, y: number, currentLayer: Layer): Point {
    const threshold = this.snapOptions.snapThreshold;
    let snapX = x;
    let snapY = y;

    const otherLayers = this.layers.filter((l) => l.id !== currentLayer.id && l.visible);

    const currentEdges = {
      left: x,
      right: x + currentLayer.width,
      top: y,
      bottom: y + currentLayer.height,
      centerX: x + currentLayer.width / 2,
      centerY: y + currentLayer.height / 2,
    };

    for (const layer of otherLayers) {
      const edges = {
        left: layer.x,
        right: layer.x + layer.width,
        top: layer.y,
        bottom: layer.y + layer.height,
        centerX: layer.x + layer.width / 2,
        centerY: layer.y + layer.height / 2,
      };

      if (Math.abs(currentEdges.left - edges.left) < threshold) {
        snapX = edges.left;
      }
      if (Math.abs(currentEdges.left - edges.right) < threshold) {
        snapX = edges.right;
      }
      if (Math.abs(currentEdges.left - edges.centerX) < threshold) {
        snapX = edges.centerX - currentLayer.width / 2;
      }

      if (Math.abs(currentEdges.right - edges.left) < threshold) {
        snapX = edges.left - currentLayer.width;
      }
      if (Math.abs(currentEdges.right - edges.right) < threshold) {
        snapX = edges.right - currentLayer.width;
      }
      if (Math.abs(currentEdges.right - edges.centerX) < threshold) {
        snapX = edges.centerX - currentLayer.width / 2;
      }

      if (Math.abs(currentEdges.top - edges.top) < threshold) {
        snapY = edges.top;
      }
      if (Math.abs(currentEdges.top - edges.bottom) < threshold) {
        snapY = edges.bottom;
      }
      if (Math.abs(currentEdges.top - edges.centerY) < threshold) {
        snapY = edges.centerY - currentLayer.height / 2;
      }

      if (Math.abs(currentEdges.bottom - edges.top) < threshold) {
        snapY = edges.top - currentLayer.height;
      }
      if (Math.abs(currentEdges.bottom - edges.bottom) < threshold) {
        snapY = edges.bottom - currentLayer.height;
      }
      if (Math.abs(currentEdges.bottom - edges.centerY) < threshold) {
        snapY = edges.centerY - currentLayer.height / 2;
      }

      if (Math.abs(currentEdges.centerX - edges.centerX) < threshold) {
        snapX = edges.centerX - currentLayer.width / 2;
      }
      if (Math.abs(currentEdges.centerY - edges.centerY) < threshold) {
        snapY = edges.centerY - currentLayer.height / 2;
      }
    }

    return { x: snapX, y: snapY };
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
