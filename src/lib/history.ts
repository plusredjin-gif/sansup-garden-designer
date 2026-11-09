import type { GardenFeature } from "../types/garden";

/** features 스냅샷 스택 (되돌리기/다시하기) */
export class History {
  private past: GardenFeature[][] = [];
  private future: GardenFeature[][] = [];
  constructor(private limit = 100) {}
  push(prev: GardenFeature[]) {
    this.past.push(prev);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  undo(cur: GardenFeature[]): GardenFeature[] | null {
    const p = this.past.pop();
    if (!p) return null;
    this.future.push(cur);
    return p;
  }
  redo(cur: GardenFeature[]): GardenFeature[] | null {
    const n = this.future.pop();
    if (!n) return null;
    this.past.push(cur);
    return n;
  }
  clear() { this.past = []; this.future = []; }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}
