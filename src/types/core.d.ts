import type { EditorConfig, EditorInstance } from './types';
export declare function createEditor(config: EditorConfig): EditorInstance;
export declare function init(selector: string, options?: Partial<EditorConfig>): EditorInstance;
export declare const Scribe: {
    init: typeof init;
    createEditor: typeof createEditor;
};
