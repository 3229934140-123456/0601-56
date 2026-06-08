export interface Sticker {
  id: string;
  name: string;
  src: string;
  category?: string;
  tags?: string[];
}

export interface Icon {
  name: string;
  category?: string;
  svg?: string;
}

export interface StickerCategory {
  id: string;
  name: string;
  stickers: Sticker[];
}

export class AssetManager {
  private stickers: Sticker[] = [];
  private stickersByCategory: Map<string, Sticker[]> = new Map();
  private icons: Icon[] = [];
  private iconCategories: string[] = [];

  addSticker(sticker: Sticker): void {
    this.stickers.push(sticker);
    if (sticker.category) {
      if (!this.stickersByCategory.has(sticker.category)) {
        this.stickersByCategory.set(sticker.category, []);
      }
      this.stickersByCategory.get(sticker.category)!.push(sticker);
    }
  }

  addStickers(stickers: Sticker[]): void {
    for (const sticker of stickers) {
      this.addSticker(sticker);
    }
  }

  getSticker(id: string): Sticker | undefined {
    return this.stickers.find((s) => s.id === id);
  }

  getAllStickers(): Sticker[] {
    return [...this.stickers];
  }

  getStickersByCategory(category: string): Sticker[] {
    return [...(this.stickersByCategory.get(category) || [])];
  }

  getStickerCategories(): string[] {
    return [...this.stickersByCategory.keys()];
  }

  searchStickers(query: string): Sticker[] {
    const lowerQuery = query.toLowerCase();
    return this.stickers.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.tags?.some((t) => t.toLowerCase().includes(lowerQuery)),
    );
  }

  removeSticker(id: string): boolean {
    const index = this.stickers.findIndex((s) => s.id === id);
    if (index > -1) {
      const sticker = this.stickers[index];
      this.stickers.splice(index, 1);
      if (sticker.category) {
        const categoryStickers = this.stickersByCategory.get(sticker.category);
        if (categoryStickers) {
          const catIndex = categoryStickers.findIndex((s) => s.id === id);
          if (catIndex > -1) {
            categoryStickers.splice(catIndex, 1);
          }
        }
      }
      return true;
    }
    return false;
  }

  addIcon(icon: Icon): void {
    this.icons.push(icon);
    if (icon.category && !this.iconCategories.includes(icon.category)) {
      this.iconCategories.push(icon.category);
    }
  }

  addIcons(icons: Icon[]): void {
    for (const icon of icons) {
      this.addIcon(icon);
    }
  }

  getIcon(name: string): Icon | undefined {
    return this.icons.find((i) => i.name === name);
  }

  getAllIcons(): Icon[] {
    return [...this.icons];
  }

  getIconsByCategory(category: string): Icon[] {
    return this.icons.filter((i) => i.category === category);
  }

  getIconCategories(): string[] {
    return [...this.iconCategories];
  }

  searchIcons(query: string): Icon[] {
    const lowerQuery = query.toLowerCase();
    return this.icons.filter((i) => i.name.toLowerCase().includes(lowerQuery));
  }

  getBuiltInIcons(): Icon[] {
    return [
      { name: 'heart', category: 'basic' },
      { name: 'star', category: 'basic' },
      { name: 'check', category: 'basic' },
      { name: 'close', category: 'basic' },
      { name: 'plus', category: 'basic' },
      { name: 'arrow-up', category: 'arrow' },
      { name: 'arrow-down', category: 'arrow' },
      { name: 'arrow-left', category: 'arrow' },
      { name: 'arrow-right', category: 'arrow' },
      { name: 'home', category: 'basic' },
      { name: 'search', category: 'basic' },
      { name: 'settings', category: 'basic' },
      { name: 'user', category: 'basic' },
      { name: 'camera', category: 'media' },
      { name: 'image', category: 'media' },
      { name: 'music', category: 'media' },
      { name: 'video', category: 'media' },
    ];
  }

  clear(): void {
    this.stickers = [];
    this.stickersByCategory.clear();
    this.icons = [];
    this.iconCategories = [];
  }
}
