import type { SelectionState, FormatState } from './types';
export declare class SelectionManager {
    private doc;
    private contentEl;
    private savedRange;
    constructor(doc: Document, contentEl: HTMLElement);
    isSelectionInContent(): boolean;
    getSelection(): SelectionState | null;
    getFormats(range?: Range): FormatState;
    private getDefaultFormats;
    private hasFormat;
    private getLinkUrl;
    private getHeadingLevel;
    private getListType;
    private getAlignment;
    saveSelection(): void;
    restoreSelection(): boolean;
    clearSavedSelection(): void;
    setSelection(range: Range): void;
    selectAll(): void;
    collapse(toStart?: boolean): void;
    getCursorPosition(): {
        top: number;
        left: number;
        height: number;
    } | null;
    getSelectionRect(): DOMRect | null;
    getSelectionOffsets(): {
        start: number;
        end: number;
    } | null;
}
