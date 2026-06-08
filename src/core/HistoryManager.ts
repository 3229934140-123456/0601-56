import type { HistoryState } from '../types';

export class HistoryManager {
  private history: HistoryState[] = [];
  private currentIndex = -1;
  private maxSize = 50;
  private isInBatch = false;
  private batchStartIndex = -1;

  push(state: HistoryState): void {
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
    this.isInBatch = true;
    this.batchStartIndex = this.currentIndex;
  }

  endBatch(): void {
    if (!this.isInBatch) return;
    this.isInBatch = false;

    if (this.batchStartIndex >= 0 && this.currentIndex > this.batchStartIndex) {
      const stepsToMerge = this.currentIndex - this.batchStartIndex;
      if (stepsToMerge > 1) {
        const finalState = this.history[this.currentIndex];
        this.history = this.history.slice(0, this.batchStartIndex + 1);
        this.history.push(finalState);
        this.currentIndex = this.batchStartIndex + 1;
      }
    }

    this.batchStartIndex = -1;
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
