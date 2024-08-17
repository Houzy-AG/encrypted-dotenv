import { identity } from 'lodash';

export interface EncryptedEnvLogger {
    info(message: string): void;
    log(message: string): void;
    error(message: string | Error): void;
}

export const defaultLogger: EncryptedEnvLogger = console;

export const defaultTestLogger = {
    info: identity,
    log: identity,
    error: identity,
};
