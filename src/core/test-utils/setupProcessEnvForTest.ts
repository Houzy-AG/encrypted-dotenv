import { afterEach, beforeEach } from '@jest/globals';
import { cloneDeep } from 'lodash';
import * as process from 'node:process';

export const setupProcessEnvForTest = (): void => {
    let processEnv: Record<string, unknown>;
    beforeEach(() => {
        processEnv = cloneDeep(process.env);
    });

    afterEach(() => {
        for (const key of Object.keys(processEnv)) {
            // @ts-ignore
            process.env[key] = processEnv[key];
        }
        for (let key of Object.keys(process.env)) {
            if (!processEnv.hasOwnProperty(key)) {
                delete process.env[key];
            }
        }
    });
};
