import type { Layer, BaseLayer, LayerType, ImageLayer, TextLayer, ShapeLayer, IconLayer, StickerLayer } from '../types';

let idCounter = 0;

function generateId(): string {
  return `layer_${Date.now()}_${++idCounter}`;
}

function createBaseLayer(type: LayerType, partial: Partial<BaseLayer> = {}): BaseLayer {
  return {
    id: partial.id || generateId(),
    type,
    name: partial.name || `${type}_${idCounter}`,
    x: partial.x ?? 50,
    y: partial.y ?? 50,
    width: partial.width ?? 100,
    height: partial.height ?? 100,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    locked: partial.locked ?? false,
    visible: partial.visible ?? true,
    zIndex: partial.zIndex ?? 0,
    blendMode: partial.blendMode || 'source-over',
  };
}

export class LayerManager {
  private layers: Layer[] = [];
  private zIndexCounter = 0;

  getAll(): Layer[] {
    return [...this.layers];
  }

  getById(id: string): Layer | undefined {
    return this.layers.find((l) => l.id === id);
  }

  add(layer: Layer): Layer {
    layer.zIndex = ++this.zIndexCounter;
    this.layers.push(layer);
    this.sortByZIndex();
    return layer;
  }

  addImageLayer(partial: Partial<ImageLayer> & { src: string }): ImageLayer {
    const base = createBaseLayer('image', partial) as ImageLayer;
    const layer: ImageLayer = {
      ...base,
      type: 'image',
      src: partial.src,
      crop: partial.crop,
      filter: partial.filter,
      mask: partial.mask,
    };
    return this.add(layer) as ImageLayer;
  }

  addTextLayer(partial: Partial<TextLayer> & { text: string }): TextLayer {
    const base = createBaseLayer('text', partial) as TextLayer;
    const layer: TextLayer = {
      ...base,
      type: 'text',
      text: partial.text,
      fontSize: partial.fontSize ?? 32,
      fontFamily: partial.fontFamily ?? 'Arial',
      fontWeight: partial.fontWeight ?? 'normal',
      fontStyle: partial.fontStyle ?? 'normal',
      textAlign: partial.textAlign ?? 'left',
      color: partial.color ?? '#000000',
      strokeColor: partial.strokeColor ?? '#ffffff',
      strokeWidth: partial.strokeWidth ?? 0,
      lineHeight: partial.lineHeight ?? 1.2,
      letterSpacing: partial.letterSpacing ?? 0,
      curved: partial.curved ?? false,
      curveRadius: partial.curveRadius,
      curveAngle: partial.curveAngle,
    };
    return this.add(layer) as TextLayer;
  }

  addShapeLayer(partial: Partial<ShapeLayer> & { shapeType: ShapeLayer['shapeType'] }): ShapeLayer {
    const base = createBaseLayer('shape', partial) as ShapeLayer;
    const layer: ShapeLayer = {
      ...base,
      type: 'shape',
      shapeType: partial.shapeType,
      fill: partial.fill ?? '#3498db',
      stroke: partial.stroke ?? '#2980b9',
      strokeWidth: partial.strokeWidth ?? 0,
      cornerRadius: partial.cornerRadius,
    };
    return this.add(layer) as ShapeLayer;
  }

  addIconLayer(partial: Partial<IconLayer> & { iconName: string }): IconLayer {
    const base = createBaseLayer('icon', partial) as IconLayer;
    const layer: IconLayer = {
      ...base,
      type: 'icon',
      iconName: partial.iconName,
      color: partial.color ?? '#333333',
      strokeWidth: partial.strokeWidth ?? 2,
    };
    return this.add(layer) as IconLayer;
  }

  addStickerLayer(partial: Partial<StickerLayer> & { stickerId: string; src: string }): StickerLayer {
    const base = createBaseLayer('sticker', partial) as StickerLayer;
    const layer: StickerLayer = {
      ...base,
      type: 'sticker',
      stickerId: partial.stickerId,
      src: partial.src,
    };
    return this.add(layer) as StickerLayer;
  }

  remove(id: string): boolean {
    const index = this.layers.findIndex((l) => l.id === id);
    if (index > -1) {
      this.layers.splice(index, 1);
      return true;
    }
    return false;
  }

  update(id: string, updates: Partial<Layer>): Layer | undefined {
    const layer = this.getById(id);
    if (layer) {
      Object.assign(layer, updates);
      return layer;
    }
    return undefined;
  }

  moveToTop(id: string): boolean {
    const layer = this.getById(id);
    if (layer) {
      layer.zIndex = ++this.zIndexCounter;
      this.sortByZIndex();
      return true;
    }
    return false;
  }

  moveToBottom(id: string): boolean {
    const layer = this.getById(id);
    if (layer) {
      const minZ = Math.min(...this.layers.map((l) => l.zIndex));
      layer.zIndex = minZ - 1;
      this.sortByZIndex();
      return true;
    }
    return false;
  }

  moveUp(id: string): boolean {
    const sorted = this.getSortedByZIndex();
    const index = sorted.findIndex((l) => l.id === id);
    if (index > -1 && index < sorted.length - 1) {
      const layer = sorted[index];
      const next = sorted[index + 1];
      const tempZ = layer.zIndex;
      layer.zIndex = next.zIndex;
      next.zIndex = tempZ;
      this.sortByZIndex();
      return true;
    }
    return false;
  }

  moveDown(id: string): boolean {
    const sorted = this.getSortedByZIndex();
    const index = sorted.findIndex((l) => l.id === id);
    if (index > 0) {
      const prev = sorted[index - 1];
      const layer = sorted[index];
      const tempZ = layer.zIndex;
      layer.zIndex = prev.zIndex;
      prev.zIndex = tempZ;
      this.sortByZIndex();
      return true;
    }
    return false;
  }

  moveToIndex(id: string, targetIndex: number): boolean {
    const sorted = this.getSortedByZIndex();
    const currentIndex = sorted.findIndex((l) => l.id === id);
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= sorted.length) {
      return false;
    }

    const layer = sorted[currentIndex];
    const targetLayer = sorted[targetIndex];

    const tempZ = layer.zIndex;
    layer.zIndex = targetLayer.zIndex;
    targetLayer.zIndex = tempZ;

    this.sortByZIndex();
    return true;
  }

  lock(id: string): boolean {
    const layer = this.getById(id);
    if (layer) {
      layer.locked = true;
      return true;
    }
    return false;
  }

  unlock(id: string): boolean {
    const layer = this.getById(id);
    if (layer) {
      layer.locked = false;
      return true;
    }
    return false;
  }

  toggleLock(id: string): boolean {
    const layer = this.getById(id);
    if (layer) {
      layer.locked = !layer.locked;
      return layer.locked;
    }
    return false;
  }

  hide(id: string): boolean {
    const layer = this.getById(id);
    if (layer) {
      layer.visible = false;
      return true;
    }
    return false;
  }

  show(id: string): boolean {
    const layer = this.getById(id);
    if (layer) {
      layer.visible = true;
      return true;
    }
    return false;
  }

  toggleVisibility(id: string): boolean {
    const layer = this.getById(id);
    if (layer) {
      layer.visible = !layer.visible;
      return layer.visible;
    }
    return false;
  }

  duplicate(id: string): Layer | undefined {
    const layer = this.getById(id);
    if (layer) {
      const cloned = JSON.parse(JSON.stringify(layer)) as Layer;
      cloned.id = generateId();
      cloned.name = `${layer.name} copy`;
      cloned.x += 20;
      cloned.y += 20;
      cloned.zIndex = ++this.zIndexCounter;
      this.layers.push(cloned);
      this.sortByZIndex();
      return cloned;
    }
    return undefined;
  }

  getLayerAtPoint(x: number, y: number): Layer | undefined {
    const sorted = this.getSortedByZIndex().reverse();
    for (const layer of sorted) {
      if (!layer.visible || layer.locked) continue;
      if (this.isPointInLayer(x, y, layer)) {
        return layer;
      }
    }
    return undefined;
  }

  private isPointInLayer(x: number, y: number, layer: Layer): boolean {
    if (layer.rotation === 0) {
      return (
        x >= layer.x &&
        x <= layer.x + layer.width &&
        y >= layer.y &&
        y <= layer.y + layer.height
      );
    }

    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    const angle = -(layer.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = x - centerX;
    const dy = y - centerY;
    const rotatedX = centerX + dx * cos - dy * sin;
    const rotatedY = centerY + dx * sin + dy * cos;

    return (
      rotatedX >= layer.x &&
      rotatedX <= layer.x + layer.width &&
      rotatedY >= layer.y &&
      rotatedY <= layer.y + layer.height
    );
  }

  private sortByZIndex(): void {
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
  }

  private getSortedByZIndex(): Layer[] {
    return [...this.layers].sort((a, b) => a.zIndex - b.zIndex);
  }

  getCount(): number {
    return this.layers.length;
  }

  clear(): void {
    this.layers = [];
    this.zIndexCounter = 0;
  }

  setLayers(layers: Layer[]): void {
    this.layers = [...layers];
    if (layers.length > 0) {
      this.zIndexCounter = Math.max(...layers.map((l) => l.zIndex));
    } else {
      this.zIndexCounter = 0;
    }
  }
}
