import { CanvasManager } from './CanvasManager';
import { LayerManager } from './LayerManager';
import { Renderer } from './Renderer';
import { SelectionManager } from './SelectionManager';
import { HistoryManager } from './HistoryManager';
import { EventManager } from './EventManager';
import { ShortcutManager } from './ShortcutManager';
import { ExportManager } from './ExportManager';
import { FilterManager } from '../tools/FilterManager';
import { ColorPanel } from '../tools/ColorPanel';
import { AssetManager } from '../tools/AssetManager';
import { BackgroundRemover } from '../tools/BackgroundRemover';
import { CropTool } from '../tools/CropTool';

import type {
  EditorOptions,
  Layer,
  ImageLayer,
  TextLayer,
  ShapeLayer,
  IconLayer,
  StickerLayer,
  BackgroundSettings,
  CanvasSettings,
  FilterSettings,
  ExportOptions,
  ThumbnailOptions,
  EditorEventName,
  EditorEvent,
  ActionRecord,
  LayerUpdateData,
  SnapOptions,
  ColorPanelConfig,
} from '../types';
import type { ShortcutAction } from './ShortcutManager';

export class CreativeDesignEditor {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;

  private canvasManager: CanvasManager;
  private layerManager: LayerManager;
  private renderer: Renderer;
  private selectionManager: SelectionManager;
  private historyManager: HistoryManager;
  private eventManager: EventManager;
  private shortcutManager: ShortcutManager;
  private exportManager: ExportManager;
  private filterManager: FilterManager;
  private colorPanel: ColorPanel;
  private assetManager: AssetManager;
  private backgroundRemover: BackgroundRemover;
  private cropTool: CropTool;

  private isDirty = false;
  private isRendering = false;
  private renderPending = false;

  private isDragging = false;
  private dragLayerId: string | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragLayerStartX = 0;
  private dragLayerStartY = 0;
  private hasDragged = false;

  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;

  constructor(options: EditorOptions) {
    const containerElement = typeof options.container === 'string'
      ? document.querySelector(options.container)
      : options.container;

    if (!containerElement) {
      throw new Error('Container element not found');
    }

    this.container = containerElement as HTMLElement;

    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.cursor = 'default';
    this.container.appendChild(this.canvas);

    this.canvasManager = new CanvasManager(this.canvas, {
      width: options.width,
      height: options.height,
      background: options.background,
      pixelRatio: options.pixelRatio,
    });

    this.layerManager = new LayerManager();
    this.renderer = new Renderer(this.canvas);
    this.selectionManager = new SelectionManager();
    this.historyManager = new HistoryManager();
    this.eventManager = new EventManager();
    this.shortcutManager = new ShortcutManager();
    this.exportManager = new ExportManager();
    this.filterManager = new FilterManager();
    this.colorPanel = new ColorPanel(options.colorPanel);
    this.assetManager = new AssetManager();
    this.backgroundRemover = new BackgroundRemover();
    this.cropTool = new CropTool();

    if (options.snap) {
      this.selectionManager.setSnapOptions(options.snap);
    }

    if (options.shortcutsEnabled !== false) {
      this.setupShortcuts();
      this.shortcutManager.attach(this.canvas);
    }

    this.exportManager.setRenderer(this.renderer);

    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);

    this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
    window.addEventListener('mousemove', this.boundHandleMouseMove);
    window.addEventListener('mouseup', this.boundHandleMouseUp);

    this.saveHistory('initial');
    this.render();
  }

  private setupShortcuts(): void {
    const shortcuts: [ShortcutAction, () => void][] = [
      ['undo', () => this.undo()],
      ['redo', () => this.redo()],
      ['delete', () => this.deleteSelectedLayer()],
      ['duplicate', () => this.duplicateSelectedLayer()],
      ['select-all', () => this.selectAll()],
      ['deselect-all', () => this.clearSelection()],
      ['move-up', () => this.nudgeSelected(0, -1)],
      ['move-down', () => this.nudgeSelected(0, 1)],
      ['move-left', () => this.nudgeSelected(-1, 0)],
      ['move-right', () => this.nudgeSelected(1, 0)],
      ['save', () => this.save()],
      ['bring-forward', () => this.bringLayerForward()],
      ['send-backward', () => this.sendLayerBackward()],
      ['bring-to-front', () => this.bringLayerToFront()],
      ['send-to-back', () => this.sendLayerToBack()],
    ];

    for (const [action, handler] of shortcuts) {
      this.shortcutManager.on(action, handler);
    }
  }

  async render(): Promise<void> {
    if (this.isRendering) {
      this.renderPending = true;
      return;
    }

    this.isRendering = true;

    try {
      this.renderer.clear();
      this.renderer.renderBackground(this.canvasManager.getBackground());

      const layers = this.layerManager.getAll();
      for (const layer of layers) {
        await this.renderer.renderLayer(layer);
      }

      this.renderSelection();
    } catch (e) {
      this.eventManager.emit('error', { error: e, message: 'Render failed' });
    }

    this.isRendering = false;

    if (this.renderPending) {
      this.renderPending = false;
      this.render();
    }
  }

  private renderSelection(): void {
    const selectedId = this.selectionManager.getSelectedId();
    if (!selectedId) return;

    const layer = this.layerManager.getById(selectedId);
    if (!layer || !layer.visible) return;

    const ctx = this.renderer.getContext();
    ctx.save();

    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(layer.x - 2, layer.y - 2, layer.width + 4, layer.height + 4);

    ctx.setLineDash([]);
    const handleSize = 8;
    const handles = [
      { x: layer.x, y: layer.y, cursor: 'nw-resize' },
      { x: layer.x + layer.width, y: layer.y, cursor: 'ne-resize' },
      { x: layer.x, y: layer.y + layer.height, cursor: 'sw-resize' },
      { x: layer.x + layer.width, y: layer.y + layer.height, cursor: 'se-resize' },
      { x: layer.x + layer.width / 2, y: layer.y, cursor: 'n-resize' },
      { x: layer.x + layer.width / 2, y: layer.y + layer.height, cursor: 's-resize' },
      { x: layer.x, y: layer.y + layer.height / 2, cursor: 'w-resize' },
      { x: layer.x + layer.width, y: layer.y + layer.height / 2, cursor: 'e-resize' },
    ];

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 1;

    for (const handle of handles) {
      ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    }

    ctx.restore();
  }

  private getCanvasMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;

    const pos = this.getCanvasMousePos(e);
    const layer = this.layerManager.getLayerAtPoint(pos.x, pos.y);

    if (layer) {
      this.selectLayer(layer.id);
      this.isDragging = true;
      this.dragLayerId = layer.id;
      this.dragStartX = pos.x;
      this.dragStartY = pos.y;
      this.dragLayerStartX = layer.x;
      this.dragLayerStartY = layer.y;
      this.hasDragged = false;
      this.canvas.style.cursor = 'move';
      this.selectionManager.setLayers(this.layerManager.getAll());
    } else {
      this.clearSelection();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.dragLayerId) return;

    const pos = this.getCanvasMousePos(e);
    const layer = this.layerManager.getById(this.dragLayerId);
    if (!layer || layer.locked) return;

    const dx = pos.x - this.dragStartX;
    const dy = pos.y - this.dragStartY;

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      this.hasDragged = true;
    }

    let newX = this.dragLayerStartX + dx;
    let newY = this.dragLayerStartY + dy;

    const snapOptions = this.selectionManager.getSnapOptions();
    if (snapOptions.enabled) {
      const snapped = this.selectionManager.snapPosition(newX, newY, layer);
      newX = snapped.x;
      newY = snapped.y;
    }

    this.layerManager.update(this.dragLayerId, { x: newX, y: newY });
    this.isDirty = true;
    this.render();
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.isDragging) return;

    if (this.hasDragged && this.dragLayerId) {
      this.saveHistory('drag_layer');
      this.recordAction('drag_layer', { layerId: this.dragLayerId });
    }

    this.isDragging = false;
    this.dragLayerId = null;
    this.hasDragged = false;
    this.canvas.style.cursor = 'default';
  }

  addImageLayer(src: string, options?: Partial<ImageLayer>): ImageLayer {
    const layer = this.layerManager.addImageLayer({ src, ...options });
    this.recordAction('add_layer', { layerId: layer.id, type: 'image' });
    this.eventManager.emit('layer:add', layer);
    this.isDirty = true;
    this.saveHistory('add_image_layer');
    this.render();
    return layer;
  }

  addTextLayer(text: string, options?: Partial<TextLayer>): TextLayer {
    const layer = this.layerManager.addTextLayer({ text, ...options });
    this.recordAction('add_layer', { layerId: layer.id, type: 'text' });
    this.eventManager.emit('layer:add', layer);
    this.isDirty = true;
    this.saveHistory('add_text_layer');
    this.render();
    return layer;
  }

  addShapeLayer(shapeType: ShapeLayer['shapeType'], options?: Partial<ShapeLayer>): ShapeLayer {
    const layer = this.layerManager.addShapeLayer({ shapeType, ...options });
    this.recordAction('add_layer', { layerId: layer.id, type: 'shape' });
    this.eventManager.emit('layer:add', layer);
    this.isDirty = true;
    this.saveHistory('add_shape_layer');
    this.render();
    return layer;
  }

  addIconLayer(iconName: string, options?: Partial<IconLayer>): IconLayer {
    const layer = this.layerManager.addIconLayer({ iconName, ...options });
    this.recordAction('add_layer', { layerId: layer.id, type: 'icon' });
    this.eventManager.emit('layer:add', layer);
    this.isDirty = true;
    this.saveHistory('add_icon_layer');
    this.render();
    return layer;
  }

  addStickerLayer(stickerId: string, src: string, options?: Partial<StickerLayer>): StickerLayer {
    const layer = this.layerManager.addStickerLayer({ stickerId, src, ...options });
    this.recordAction('add_layer', { layerId: layer.id, type: 'sticker' });
    this.eventManager.emit('layer:add', layer);
    this.isDirty = true;
    this.saveHistory('add_sticker_layer');
    this.render();
    return layer;
  }

  removeLayer(id: string): boolean {
    const layer = this.layerManager.getById(id);
    if (!layer) return false;

    const result = this.layerManager.remove(id);
    if (result) {
      if (this.selectionManager.getSelectedId() === id) {
        this.selectionManager.clearSelection();
      }
      this.recordAction('remove_layer', { layerId: id });
      this.eventManager.emit('layer:remove', { id });
      this.isDirty = true;
      this.saveHistory('remove_layer');
      this.render();
    }
    return result;
  }

  updateLayer(id: string, updates: Partial<Layer>): Layer | undefined {
    const layer = this.layerManager.update(id, updates);
    if (layer) {
      this.recordAction('update_layer', { layerId: id, updates });
      this.eventManager.emit('layer:update', layer);
      this.isDirty = true;
      this.saveHistory('update_layer');
      this.render();
    }
    return layer;
  }

  updateLayerBatch(updates: LayerUpdateData[]): void {
    this.historyManager.beginBatch();
    for (const update of updates) {
      const { id, ...rest } = update;
      this.layerManager.update(id, rest);
    }
    this.saveHistory('batch_update');
    this.historyManager.endBatch();
    this.isDirty = true;
    this.render();
  }

  selectLayer(id: string): void {
    const layer = this.layerManager.getById(id);
    if (layer && !layer.locked) {
      this.selectionManager.select(id);
      this.eventManager.emit('layer:select', { id });
      this.render();
    }
  }

  clearSelection(): void {
    this.selectionManager.clearSelection();
    this.render();
  }

  selectAll(): void {
    const layers = this.layerManager.getAll().filter((l) => !l.locked && l.visible);
    if (layers.length > 0) {
      this.selectLayer(layers[layers.length - 1].id);
    }
  }

  getSelectedLayer(): Layer | undefined {
    const id = this.selectionManager.getSelectedId();
    if (!id) return undefined;
    return this.layerManager.getById(id);
  }

  getSelectedLayerId(): string | null {
    return this.selectionManager.getSelectedId();
  }

  deleteSelectedLayer(): boolean {
    const id = this.getSelectedLayerId();
    if (id) {
      return this.removeLayer(id);
    }
    return false;
  }

  duplicateSelectedLayer(): Layer | undefined {
    const id = this.getSelectedLayerId();
    if (id) {
      const newLayer = this.layerManager.duplicate(id);
      if (newLayer) {
        this.recordAction('duplicate_layer', { layerId: id, newLayerId: newLayer.id });
        this.eventManager.emit('layer:add', newLayer);
        this.selectionManager.select(newLayer.id);
        this.isDirty = true;
        this.saveHistory('duplicate_layer');
        this.render();
        return newLayer;
      }
    }
    return undefined;
  }

  nudgeSelected(dx: number, dy: number): void {
    const id = this.getSelectedLayerId();
    if (id) {
      const layer = this.layerManager.getById(id);
      if (layer && !layer.locked) {
        const snapOptions = this.selectionManager.getSnapOptions();
        let newX = layer.x + dx;
        let newY = layer.y + dy;

        if (snapOptions.enabled && snapOptions.snapToGrid) {
          const gridSize = snapOptions.gridSize;
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
        }

        this.layerManager.update(id, { x: newX, y: newY });
        this.saveHistory('nudge_layer');
        this.isDirty = true;
        this.render();
      }
    }
  }

  moveLayerToFront(id: string): boolean {
    const result = this.layerManager.moveToTop(id);
    if (result) {
      this.recordAction('layer_order', { layerId: id, action: 'to_front' });
      this.saveHistory('move_layer');
      this.render();
    }
    return result;
  }

  moveLayerToBack(id: string): boolean {
    const result = this.layerManager.moveToBottom(id);
    if (result) {
      this.recordAction('layer_order', { layerId: id, action: 'to_back' });
      this.saveHistory('move_layer');
      this.render();
    }
    return result;
  }

  moveLayerForward(id: string): boolean {
    const result = this.layerManager.moveUp(id);
    if (result) {
      this.recordAction('layer_order', { layerId: id, action: 'forward' });
      this.saveHistory('move_layer');
      this.render();
    }
    return result;
  }

  moveLayerBackward(id: string): boolean {
    const result = this.layerManager.moveDown(id);
    if (result) {
      this.recordAction('layer_order', { layerId: id, action: 'backward' });
      this.saveHistory('move_layer');
      this.render();
    }
    return result;
  }

  bringLayerForward(): boolean {
    const id = this.getSelectedLayerId();
    return id ? this.moveLayerForward(id) : false;
  }

  sendLayerBackward(): boolean {
    const id = this.getSelectedLayerId();
    return id ? this.moveLayerBackward(id) : false;
  }

  bringLayerToFront(): boolean {
    const id = this.getSelectedLayerId();
    return id ? this.moveLayerToFront(id) : false;
  }

  sendLayerToBack(): boolean {
    const id = this.getSelectedLayerId();
    return id ? this.moveLayerToBack(id) : false;
  }

  lockLayer(id: string): boolean {
    const result = this.layerManager.lock(id);
    if (result) {
      this.recordAction('lock_layer', { layerId: id });
      if (this.selectionManager.getSelectedId() === id) {
        this.selectionManager.clearSelection();
      }
      this.saveHistory('lock_layer');
      this.render();
    }
    return result;
  }

  unlockLayer(id: string): boolean {
    const result = this.layerManager.unlock(id);
    if (result) {
      this.recordAction('unlock_layer', { layerId: id });
      this.saveHistory('unlock_layer');
      this.render();
    }
    return result;
  }

  toggleLayerLock(id: string): boolean {
    const layer = this.layerManager.getById(id);
    if (layer) {
      return layer.locked ? this.unlockLayer(id) : this.lockLayer(id);
    }
    return false;
  }

  hideLayer(id: string): boolean {
    const result = this.layerManager.hide(id);
    if (result) {
      this.recordAction('hide_layer', { layerId: id });
      if (this.selectionManager.getSelectedId() === id) {
        this.selectionManager.clearSelection();
      }
      this.saveHistory('hide_layer');
      this.render();
    }
    return result;
  }

  showLayer(id: string): boolean {
    const result = this.layerManager.show(id);
    if (result) {
      this.recordAction('show_layer', { layerId: id });
      this.saveHistory('show_layer');
      this.render();
    }
    return result;
  }

  toggleLayerVisibility(id: string): boolean {
    const layer = this.layerManager.getById(id);
    if (layer) {
      return layer.visible ? this.hideLayer(id) : this.showLayer(id);
    }
    return false;
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasManager.setSize(width, height);
    this.recordAction('canvas_resize', { width, height });
    this.eventManager.emit('canvas:resize', { width, height });
    this.saveHistory('resize_canvas');
    this.isDirty = true;
    this.render();
  }

  getCanvasSize(): { width: number; height: number } {
    return this.canvasManager.getSize();
  }

  setBackground(background: BackgroundSettings): void {
    this.canvasManager.setBackground(background);
    this.recordAction('change_background', { background });
    this.saveHistory('change_background');
    this.isDirty = true;
    this.render();
  }

  setBackgroundColor(color: string): void {
    this.canvasManager.setBackgroundColor(color);
    this.recordAction('change_background_color', { color });
    this.saveHistory('change_background');
    this.isDirty = true;
    this.render();
  }

  setBackgroundImage(src: string): void {
    this.canvasManager.setBackgroundImage(src);
    this.recordAction('change_background_image', { src });
    this.saveHistory('change_background');
    this.isDirty = true;
    this.render();
  }

  setBackgroundTransparent(): void {
    this.canvasManager.setBackgroundTransparent();
    this.saveHistory('change_background');
    this.isDirty = true;
    this.render();
  }

  getBackground(): BackgroundSettings {
    return this.canvasManager.getBackground();
  }

  setLayerFilter(id: string, filter: Partial<FilterSettings>): void {
    const layer = this.layerManager.getById(id) as ImageLayer | undefined;
    if (layer && layer.type === 'image') {
      const newFilter = { ...(layer.filter || {}), ...filter };
      this.layerManager.update(id, { filter: newFilter });
      this.recordAction('apply_filter', { layerId: id, filter });
      this.saveHistory('apply_filter');
      this.isDirty = true;
      this.render();
    }
  }

  resetLayerFilter(id: string): void {
    this.setLayerFilter(id, {});
  }

  applyFilterPreset(id: string, presetName: string): void {
    const preset = this.filterManager.getPreset(presetName);
    if (preset) {
      this.setLayerFilter(id, preset);
    }
  }

  getFilterPresets(): string[] {
    return this.filterManager.getPresetNames();
  }

  async removeImageBackground(id: string): Promise<void> {
    const layer = this.layerManager.getById(id) as ImageLayer | undefined;
    if (!layer || layer.type !== 'image') return;

    try {
      const newSrc = await this.backgroundRemover.removeBackgroundSimple(layer.src);
      this.layerManager.update(id, { src: newSrc } as Partial<ImageLayer>);
      this.recordAction('remove_background', { layerId: id });
      this.saveHistory('remove_background');
      this.isDirty = true;
      this.render();
    } catch (e) {
      this.eventManager.emit('error', { error: e, message: 'Remove background failed' });
    }
  }

  async removeImageBackgroundByColor(id: string, color: string, tolerance?: number): Promise<void> {
    const layer = this.layerManager.getById(id) as ImageLayer | undefined;
    if (!layer || layer.type !== 'image') return;

    try {
      const newSrc = await this.backgroundRemover.removeByColor(layer.src, color, { tolerance });
      this.layerManager.update(id, { src: newSrc } as Partial<ImageLayer>);
      this.recordAction('remove_background_color', { layerId: id, color });
      this.saveHistory('remove_background');
      this.isDirty = true;
      this.render();
    } catch (e) {
      this.eventManager.emit('error', { error: e, message: 'Remove background failed' });
    }
  }

  setLayerOpacity(id: string, opacity: number): void {
    this.layerManager.update(id, { opacity: Math.max(0, Math.min(1, opacity)) });
    this.recordAction('change_opacity', { layerId: id, opacity });
    this.saveHistory('change_opacity');
    this.isDirty = true;
    this.render();
  }

  setLayerRotation(id: string, rotation: number): void {
    this.layerManager.update(id, { rotation });
    this.recordAction('rotate_layer', { layerId: id, rotation });
    this.saveHistory('rotate_layer');
    this.isDirty = true;
    this.render();
  }

  setLayerPosition(id: string, x: number, y: number): void {
    const layer = this.layerManager.getById(id);
    if (layer && !layer.locked) {
      this.selectionManager.setLayers(this.layerManager.getAll());
      const snapped = this.selectionManager.snapPosition(x, y, layer);
      this.layerManager.update(id, { x: snapped.x, y: snapped.y });
      this.selectionManager.updateLayer(this.layerManager.getById(id)!);
      this.saveHistory('move_layer');
      this.isDirty = true;
      this.render();
    }
  }

  setLayerSize(id: string, width: number, height: number): void {
    this.layerManager.update(id, { width, height });
    this.saveHistory('resize_layer');
    this.isDirty = true;
    this.render();
  }

  updateTextLayer(id: string, updates: Partial<TextLayer>): void {
    this.layerManager.update(id, updates as Partial<Layer>);
    this.recordAction('update_text', { layerId: id, updates });
    this.saveHistory('update_text');
    this.isDirty = true;
    this.render();
  }

  setTextCurved(id: string, curved: boolean, radius?: number, angle?: number): void {
    const updates: Partial<TextLayer> = { curved };
    if (radius !== undefined) updates.curveRadius = radius;
    if (angle !== undefined) updates.curveAngle = angle;
    this.updateTextLayer(id, updates);
  }

  undo(): boolean {
    const state = this.historyManager.undo();
    if (state) {
      this.restoreHistoryState(state);
      this.eventManager.emit('history:undo');
      this.recordAction('undo');
      this.isDirty = true;
      this.render();
      return true;
    }
    return false;
  }

  redo(): boolean {
    const state = this.historyManager.redo();
    if (state) {
      this.restoreHistoryState(state);
      this.eventManager.emit('history:redo');
      this.recordAction('redo');
      this.isDirty = true;
      this.render();
      return true;
    }
    return false;
  }

  canUndo(): boolean {
    return this.historyManager.canUndo();
  }

  canRedo(): boolean {
    return this.historyManager.canRedo();
  }

  private saveHistory(actionName: string): void {
    const state = {
      layers: JSON.parse(JSON.stringify(this.layerManager.getAll())),
      canvas: this.canvasManager.getSettings(),
      selection: this.selectionManager.getSelectedId(),
    };
    this.historyManager.push(state);
  }

  private restoreHistoryState(state: any): void {
    if (state.layers) {
      this.layerManager.setLayers(state.layers);
      this.selectionManager.setLayers(state.layers);
    }
    if (state.canvas) {
      this.canvasManager.setSize(state.canvas.width, state.canvas.height);
      this.canvasManager.setBackground(state.canvas.background);
    }
    if (state.selection !== undefined) {
      this.selectionManager.select(state.selection);
    }
  }

  async exportImage(options?: ExportOptions): Promise<string> {
    const dataUrl = await this.exportManager.exportImage(
      this.layerManager.getAll(),
      this.canvasManager.getSettings(),
      options,
    );
    this.eventManager.emit('export:complete', { dataUrl, options });
    return dataUrl;
  }

  async exportImageBlob(options?: ExportOptions): Promise<Blob> {
    return this.exportManager.exportToBlob(
      this.layerManager.getAll(),
      this.canvasManager.getSettings(),
      options,
    );
  }

  async generateThumbnail(options: ThumbnailOptions): Promise<string> {
    return this.exportManager.generateThumbnail(
      this.layerManager.getAll(),
      this.canvasManager.getSettings(),
      options,
    );
  }

  async exportMultiResolution(scales: number[], options?: Omit<ExportOptions, 'scale'>): Promise<{ scale: number; dataUrl: string }[]> {
    return this.exportManager.exportMultiResolution(
      this.layerManager.getAll(),
      this.canvasManager.getSettings(),
      scales,
      options,
    );
  }

  getState(): string {
    return this.exportManager.serializeState(
      this.layerManager.getAll(),
      this.canvasManager.getSettings(),
    );
  }

  loadState(json: string): boolean {
    const state = this.exportManager.deserializeState(json);
    if (state) {
      this.layerManager.setLayers(state.layers);
      this.selectionManager.setLayers(state.layers);
      this.canvasManager.setSize(state.canvas.width, state.canvas.height);
      this.canvasManager.setBackground(state.canvas.background);
      this.selectionManager.clearSelection();
      this.historyManager.clear();
      this.saveHistory('load_state');
      this.isDirty = true;
      this.render();
      return true;
    }
    return false;
  }

  save(): void {
    const state = this.getState();
    this.eventManager.emit('save', { state, timestamp: Date.now() });
    this.recordAction('save');
    this.isDirty = false;
  }

  preview(): void {
    this.eventManager.emit('preview', {
      layers: this.layerManager.getAll(),
      canvas: this.canvasManager.getSettings(),
    });
    this.recordAction('preview');
  }

  on(event: EditorEventName, callback: (event: EditorEvent) => void): () => void {
    return this.eventManager.on(event, callback);
  }

  onAction(callback: (action: ActionRecord) => void): () => void {
    return this.eventManager.onAction(callback);
  }

  private recordAction(action: string, details?: Record<string, any>): void {
    const selectedId = this.selectionManager.getSelectedId();
    const record: ActionRecord = {
      action,
      layerId: selectedId || undefined,
      timestamp: Date.now(),
      details,
    };
    this.eventManager.emit('action', record);
  }

  getActionHistory(): ActionRecord[] {
    return this.eventManager.getActionHistory();
  }

  getLayers(): Layer[] {
    return this.layerManager.getAll();
  }

  getLayer(id: string): Layer | undefined {
    return this.layerManager.getById(id);
  }

  getLayerCount(): number {
    return this.layerManager.getCount();
  }

  setSnapOptions(options: Partial<SnapOptions>): void {
    this.selectionManager.setSnapOptions(options);
  }

  getSnapOptions(): SnapOptions {
    return this.selectionManager.getSnapOptions();
  }

  getColorPanel(): ColorPanel {
    return this.colorPanel;
  }

  getAssetManager(): AssetManager {
    return this.assetManager;
  }

  getCanvasElement(): HTMLCanvasElement {
    return this.canvas;
  }

  getIsDirty(): boolean {
    return this.isDirty;
  }

  setShortcutsEnabled(enabled: boolean): void {
    if (enabled) {
      this.shortcutManager.attach(this.canvas);
    } else {
      this.shortcutManager.detach();
    }
  }

  addShortcut(shortcut: string, action: ShortcutAction): void {
    this.shortcutManager.setShortcut(shortcut, action);
  }

  destroy(): void {
    this.shortcutManager.destroy();
    this.eventManager.destroy();
    this.renderer.destroy();
    this.exportManager.destroy();
    this.backgroundRemover.destroy();
    this.layerManager.clear();
    this.historyManager.clear();

    this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
    window.removeEventListener('mousemove', this.boundHandleMouseMove);
    window.removeEventListener('mouseup', this.boundHandleMouseUp);

    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
