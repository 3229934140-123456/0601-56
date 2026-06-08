import type { EditorEvent, EditorEventName, ActionRecord } from '../types';

type EventCallback = (event: EditorEvent) => void;
type ActionCallback = (action: ActionRecord) => void;

export class EventManager {
  private listeners: Map<EditorEventName, EventCallback[]> = new Map();
  private actionListeners: ActionCallback[] = [];
  private actionHistory: ActionRecord[] = [];
  private maxHistorySize = 100;

  on(event: EditorEventName, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    return () => this.off(event, callback);
  }

  off(event: EditorEventName, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: EditorEventName, data?: any): void {
    const eventObj: EditorEvent = {
      type: event,
      timestamp: Date.now(),
      data,
    };

    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(eventObj);
        } catch (e) {
          console.error(`[EventManager] Error in ${event} listener:`, e);
        }
      }
    }

    if (event === 'action' && data) {
      this.recordAction(data);
    }
  }

  onAction(callback: ActionCallback): () => void {
    this.actionListeners.push(callback);
    return () => {
      const index = this.actionListeners.indexOf(callback);
      if (index > -1) {
        this.actionListeners.splice(index, 1);
      }
    };
  }

  recordAction(action: ActionRecord): void {
    if (!action.timestamp) {
      action.timestamp = Date.now();
    }
    this.actionHistory.push(action);
    if (this.actionHistory.length > this.maxHistorySize) {
      this.actionHistory.shift();
    }

    for (const listener of this.actionListeners) {
      try {
        listener(action);
      } catch (e) {
        console.error('[EventManager] Error in action listener:', e);
      }
    }
  }

  getActionHistory(): ActionRecord[] {
    return [...this.actionHistory];
  }

  clearActionHistory(): void {
    this.actionHistory = [];
  }

  destroy(): void {
    this.listeners.clear();
    this.actionListeners = [];
    this.actionHistory = [];
  }
}
