import { identity } from 'lodash';

export interface EncryptedEnvLogger {
    info(...message: unknown[]): void;
    log(...message: unknown[]): void;
    error(...message: unknown[]): void;
}

export const defaultLogger: EncryptedEnvLogger = console;

export const defaultTestLogger = {
    info: identity,
    log: identity,
    error: identity,
};
