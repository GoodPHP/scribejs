import type { SanitizeConfig } from './types';
export declare class HTMLSanitizer {
    private config;
    constructor(config?: SanitizeConfig);
    sanitize(html: string): string;
    private processNode;
    private getAllowedAttributes;
    private isAttributeAllowed;
    private isUrlSafe;
    private sanitizeStyle;
    private isEmpty;
    sanitizePaste(html: string): string;
}
