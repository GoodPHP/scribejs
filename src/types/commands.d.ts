import type { CommandHandler } from './types';
export declare const coreCommands: Record<string, CommandHandler>;
export declare const defaultShortcuts: ({
    key: string;
    ctrl: boolean;
    command: string;
    shift?: undefined;
} | {
    key: string;
    ctrl: boolean;
    shift: boolean;
    command: string;
})[];
