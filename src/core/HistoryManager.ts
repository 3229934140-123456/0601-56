import type { HistoryState } from '../types';

export class HistoryManager {
  private history: HistoryState[] = [];
  private currentIndex = -1;
  private maxSize = 50;
  private isCollecting = false;
  private pendingState: HistoryState | null = null;

  push(state: HistoryState): void {
    if (this.isCollecting) {
      this.pendingState = { ...state };
      return;
    }

    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    this.history.push({
      layers: JSON.parse(JSON.stringify(state.layers)),
      canvas: JSON.parse(JSON.stringify(state.canvas)),
      selection: state.selection,
    });

    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  beginBatch(): void {
    this.isCollecting = true;
  }

  endBatch(): void {
    this.isCollecting = false;
    if (this.pendingState) {
      this.push(this.pendingState);
      this.pendingState = null;
    }
  }

  undo(): HistoryState | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }

  redo(): HistoryState | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  getCurrentState(): HistoryState | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }

  setMaxSize(size: number): void {
    this.maxSize = size;
    if (this.history.length > size) {
      const overflow = this.history.length - size;
      this.history = this.history.slice(overflow);
      this.currentIndex = Math.max(0, this.currentIndex - overflow);
    }
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  getHistoryCount(): number {
    return this.history.length;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }
}
