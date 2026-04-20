import { afterEach, beforeEach } from '@jest/globals';
import { cloneDeep } from 'lodash';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as process from 'node:process';

export const DOT_ENV_FILES_DIRECTORY_FOR_TESTING = path.join(__dirname, '../../__test-files');

const removeDotEnvFileDirectory = () => {
    if (fs.existsSync(DOT_ENV_FILES_DIRECTORY_FOR_TESTING)) {
        fs.rmSync(DOT_ENV_FILES_DIRECTORY_FOR_TESTING, { recursive: true, force: true });
    }
};

export const setupTests = (): void => {
    let processEnv: Record<string, unknown>;

    beforeEach(() => {
        processEnv = cloneDeep(process.env);
        removeDotEnvFileDirectory();
        fs.mkdirSync(DOT_ENV_FILES_DIRECTORY_FOR_TESTING, { recursive: true });
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

        removeDotEnvFileDirectory();
    });
};
