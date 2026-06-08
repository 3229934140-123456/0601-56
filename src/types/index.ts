export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LayerType = 'image' | 'text' | 'shape' | 'icon' | 'sticker';

export type ShapeType = 'rect' | 'circle' | 'triangle' | 'star' | 'line' | 'arrow';

export type BackgroundType = 'color' | 'image' | 'gradient' | 'transparent';

export interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  blendMode?: GlobalCompositeOperation;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  filter?: FilterSettings;
  mask?: ImageData;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: 'left' | 'center' | 'right';
  color: string;
  strokeColor: string;
  strokeWidth: number;
  lineHeight: number;
  letterSpacing: number;
  curved?: boolean;
  curveRadius?: number;
  curveAngle?: number;
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shapeType: ShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius?: number;
}

export interface IconLayer extends BaseLayer {
  type: 'icon';
  iconName: string;
  color: string;
  strokeWidth: number;
}

export interface StickerLayer extends BaseLayer {
  type: 'sticker';
  stickerId: string;
  src: string;
}

export type Layer = ImageLayer | TextLayer | ShapeLayer | IconLayer | StickerLayer;

export interface FilterSettings {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  grayscale?: number;
  sepia?: number;
  blur?: number;
  hueRotate?: number;
  invert?: number;
}

export interface CanvasSettings {
  width: number;
  height: number;
  background: BackgroundSettings;
  pixelRatio?: number;
}

export interface BackgroundSettings {
  type: BackgroundType;
  color?: string;
  image?: string;
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    angle?: number;
  };
}

export interface HistoryState {
  layers: Layer[];
  canvas: CanvasSettings;
  selection: string | null;
}

export interface ExportOptions {
  type?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  scale?: number;
  width?: number;
  height?: number;
  includeBackground?: boolean;
}

export interface ThumbnailOptions {
  maxWidth: number;
  maxHeight: number;
  type?: 'png' | 'jpeg';
  quality?: number;
}

export type EditorEventName =
  | 'save'
  | 'preview'
  | 'error'
  | 'action'
  | 'layer:add'
  | 'layer:remove'
  | 'layer:update'
  | 'layer:select'
  | 'canvas:resize'
  | 'history:undo'
  | 'history:redo'
  | 'export:complete';

export interface EditorEvent {
  type: EditorEventName;
  timestamp: number;
  data?: any;
}

export interface ActionRecord {
  action: string;
  layerId?: string;
  timestamp: number;
  details?: Record<string, any>;
}

export interface SnapOptions {
  enabled: boolean;
  snapToGrid: boolean;
  gridSize: number;
  snapToGuides: boolean;
  snapToObjects: boolean;
  snapThreshold: number;
}

export interface ColorPanelConfig {
  presets: string[];
  recentColors: string[];
  allowCustom: boolean;
  allowOpacity: boolean;
}

export interface EditorOptions {
  container: HTMLElement | string;
  width?: number;
  height?: number;
  background?: BackgroundSettings;
  pixelRatio?: number;
  snap?: Partial<SnapOptions>;
  colorPanel?: Partial<ColorPanelConfig>;
  shortcutsEnabled?: boolean;
}

export type LayerUpdateData = Partial<Layer> & { id: string };
