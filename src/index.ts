export { CreativeDesignEditor } from './core/CreativeDesignEditor';
export { CanvasManager } from './core/CanvasManager';
export { LayerManager } from './core/LayerManager';
export { Renderer } from './core/Renderer';
export { SelectionManager } from './core/SelectionManager';
export { HistoryManager } from './core/HistoryManager';
export { EventManager } from './core/EventManager';
export { ShortcutManager } from './core/ShortcutManager';
export { ExportManager } from './core/ExportManager';
export { FilterManager, presetFilters, defaultFilterSettings } from './tools/FilterManager';
export { ColorPanel } from './tools/ColorPanel';
export { AssetManager } from './tools/AssetManager';
export { BackgroundRemover } from './tools/BackgroundRemover';
export { CropTool } from './tools/CropTool';

export type {
  Point,
  Size,
  Rect,
  LayerType,
  ShapeType,
  BackgroundType,
  BaseLayer,
  ImageLayer,
  TextLayer,
  ShapeLayer,
  IconLayer,
  StickerLayer,
  Layer,
  FilterSettings,
  CanvasSettings,
  BackgroundSettings,
  HistoryState,
  ExportOptions,
  ThumbnailOptions,
  EditorEventName,
  EditorEvent,
  ActionRecord,
  SnapOptions,
  ColorPanelConfig,
  EditorOptions,
  LayerUpdateData,
} from './types';

export type { ShortcutAction, ShortcutConfig } from './core/ShortcutManager';
export type { Sticker, Icon, StickerCategory } from './tools/AssetManager';
export type { CropState } from './tools/CropTool';
export type { RemoveBackgroundOptions } from './tools/BackgroundRemover';
