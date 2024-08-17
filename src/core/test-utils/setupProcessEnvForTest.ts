import { afterEach, beforeEach } from '@jest/globals';
import { cloneDeep } from 'lodash';
import { readFileSync } from 'node:fs';
import * as process from 'node:process';
import * as fs from 'node:fs';
import { TestFilesLocator } from '../../test-files/test-files-locator';

export const setupProcessEnvForTest = (): void => {
    let processEnv: Record<string, unknown>;
    beforeEach(() => {
        processEnv = cloneDeep(process.env);

        if (fs.existsSync(TestFilesLocator.tests_fs_directory_location)) {
            fs.rmSync(TestFilesLocator.tests_fs_directory_location, { recursive: true, force: true });
        }

        fs.mkdirSync(TestFilesLocator.tests_fs_directory_location, { recursive: true });
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

        if (fs.existsSync(TestFilesLocator.tests_fs_directory_location)) {
            fs.rmSync(TestFilesLocator.tests_fs_directory_location, { recursive: true, force: true });
        }
    });
};

export const expectFileToExistWithContent = (
    filePath: string,
    content: string,
    done: { fail: (error?: string | { message: string }) => unknown },
): boolean => {
    if (!fs.existsSync(filePath)) {
        done.fail(`Failed to write : "${TestFilesLocator.tests_fs_directory_location}/.env.dev" `);
        return false;
    }
    expect(readFileSync(filePath).toString()).toEqual(content);
    return true;
};
