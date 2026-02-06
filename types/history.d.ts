import type { HistoryEntry } from './types';
export declare class HistoryManager {
    private stack;
    private position;
    private maxSize;
    private debounceTimer;
    private debounceDelay;
    private lastContent;
    constructor(maxSize?: number);
    push(html: string, selection: {
        start: number;
        end: number;
    } | null): void;
    pushImmediate(html: string, selection: {
        start: number;
        end: number;
    } | null): void;
    private addEntry;
    undo(): HistoryEntry | null;
    redo(): HistoryEntry | null;
    canUndo(): boolean;
    canRedo(): boolean;
    getCurrent(): HistoryEntry | null;
    clear(): void;
    getStackSize(): number;
    getPosition(): number;
}
