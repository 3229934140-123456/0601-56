export type ShortcutAction =
  | 'undo'
  | 'redo'
  | 'delete'
  | 'duplicate'
  | 'select-all'
  | 'deselect-all'
  | 'move-up'
  | 'move-down'
  | 'move-left'
  | 'move-right'
  | 'nudge-up'
  | 'nudge-down'
  | 'nudge-left'
  | 'nudge-right'
  | 'save'
  | 'copy'
  | 'paste'
  | 'bring-forward'
  | 'send-backward'
  | 'bring-to-front'
  | 'send-to-back'
  | 'group'
  | 'ungroup'
  | 'zoom-in'
  | 'zoom-out'
  | 'fit-screen';

export interface ShortcutConfig {
  [key: string]: ShortcutAction;
}

const defaultShortcuts: ShortcutConfig = {
  'ctrl+z': 'undo',
  'meta+z': 'undo',
  'ctrl+shift+z': 'redo',
  'meta+shift+z': 'redo',
  'ctrl+y': 'redo',
  'meta+y': 'redo',
  'delete': 'delete',
  'backspace': 'delete',
  'ctrl+d': 'duplicate',
  'meta+d': 'duplicate',
  'ctrl+a': 'select-all',
  'meta+a': 'select-all',
  'escape': 'deselect-all',
  'arrowup': 'move-up',
  'arrowdown': 'move-down',
  'arrowleft': 'move-left',
  'arrowright': 'move-right',
  'ctrl+c': 'copy',
  'meta+c': 'copy',
  'ctrl+v': 'paste',
  'meta+v': 'paste',
  'ctrl+]': 'bring-forward',
  'meta+]': 'bring-forward',
  'ctrl+[': 'send-backward',
  'meta+[': 'send-backward',
  'ctrl+shift+]': 'bring-to-front',
  'meta+shift+]': 'bring-to-front',
  'ctrl+shift+[': 'send-to-back',
  'meta+shift+[': 'send-to-back',
  'ctrl+g': 'group',
  'meta+g': 'group',
  'ctrl+shift+g': 'ungroup',
  'meta+shift+g': 'ungroup',
  'ctrl+s': 'save',
  'meta+s': 'save',
  'ctrl+=': 'zoom-in',
  'meta+=': 'zoom-in',
  'ctrl+-': 'zoom-out',
  'meta+-': 'zoom-out',
  'ctrl+0': 'fit-screen',
  'meta+0': 'fit-screen',
};

export class ShortcutManager {
  private shortcuts: ShortcutConfig;
  private listeners: Map<ShortcutAction, (() => void)[]> = new Map();
  private enabled = true;
  private targetElement: HTMLElement | null = null;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;

  constructor(customShortcuts?: Partial<ShortcutConfig>) {
    this.shortcuts = { ...defaultShortcuts };
    if (customShortcuts) {
      for (const key of Object.keys(customShortcuts)) {
        const action = customShortcuts[key];
        if (action) {
          this.shortcuts[key.toLowerCase()] = action;
        }
      }
    }
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  attach(element: HTMLElement): void {
    this.detach();
    this.targetElement = element;
    element.addEventListener('keydown', this.boundHandleKeyDown);
  }

  detach(): void {
    if (this.targetElement) {
      this.targetElement.removeEventListener('keydown', this.boundHandleKeyDown);
      this.targetElement = null;
    }
  }

  on(action: ShortcutAction, callback: () => void): () => void {
    if (!this.listeners.has(action)) {
      this.listeners.set(action, []);
    }
    this.listeners.get(action)!.push(callback);
    return () => this.off(action, callback);
  }

  off(action: ShortcutAction, callback: () => void): void {
    const callbacks = this.listeners.get(action);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  setShortcut(shortcut: string, action: ShortcutAction): void {
    this.shortcuts[shortcut.toLowerCase()] = action;
  }

  removeShortcut(shortcut: string): void {
    delete this.shortcuts[shortcut.toLowerCase()];
  }

  getShortcuts(): ShortcutConfig {
    return { ...this.shortcuts };
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    const key = this.normalizeKey(e);
    const action = this.shortcuts[key];

    if (action) {
      const callbacks = this.listeners.get(action);
      if (callbacks && callbacks.length > 0) {
        e.preventDefault();
        for (const callback of callbacks) {
          try {
            callback();
          } catch (err) {
            console.error('[ShortcutManager] Error executing shortcut:', action, err);
          }
        }
      }
    }
  }

  private normalizeKey(e: KeyboardEvent): string {
    const parts: string[] = [];

    if (e.ctrlKey) parts.push('ctrl');
    if (e.metaKey) parts.push('meta');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');

    const key = e.key.toLowerCase();
    parts.push(key);

    return parts.join('+');
  }

  triggerAction(action: ShortcutAction): void {
    const callbacks = this.listeners.get(action);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback();
        } catch (err) {
          console.error('[ShortcutManager] Error triggering action:', action, err);
        }
      }
    }
  }

  destroy(): void {
    this.detach();
    this.listeners.clear();
  }
}
