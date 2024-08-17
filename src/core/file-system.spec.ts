import * as fs from 'fs';
import { last } from 'lodash';
import { writeFileSync } from 'node:fs';
import * as os from 'node:os';
import { TestFilesLocator } from '../test-files/test-files-locator';
import { findAllDotEnvFiles, getEnvFilesDirectory, getEnvironmentNameFromFileName } from './file-system';
import { defaultTestLogger } from './logger/encrypted-env-logger';
import * as process from 'process';
import { setupProcessEnvForTest } from './test-utils/setupProcessEnvForTest';

setupProcessEnvForTest();

describe('getEnvFilesDirectory', () => {
    test('should return current working directory when dotEnvFilesDirectory is not provided', () => {
        const result = getEnvFilesDirectory({ dotEnvFilesDirectory: undefined, logger: defaultTestLogger });

        expect(result).toBe(process.cwd());
    });

    test('should return resolved directory path when dotEnvFilesDirectory is provided', () => {
        const result = getEnvFilesDirectory({ dotEnvFilesDirectory: TestFilesLocator.tests_fs_directory_location, logger: defaultTestLogger });

        expect(result).toBe(TestFilesLocator.tests_fs_directory_location);
    });
});

describe('findAllDotEnvFiles', () => {
    test('should return an empty array when no .env files are found', () => {
        const result = findAllDotEnvFiles({ dotEnvFilesDirectory: TestFilesLocator.tests_fs_directory_location, logger: defaultTestLogger });

        expect(result).toEqual([]);
    });

    test('should return an array of file paths and names for found .env files', () => {
        const filesList = [
            {
                path: `${TestFilesLocator.tests_fs_directory_location}/.env.local`,
                content: [`VAR_ONE=1`, `VAR_TWO=2`].join(os.EOL),
            },
            {
                path: `${TestFilesLocator.tests_fs_directory_location}/.env.test`,
                content: [`VAR_THREE=3`, `VAR_THREE=3`].join(os.EOL),
            },
        ];

        for (const file of filesList) {
            writeFileSync(file.path, file.content, {});
        }
        const result = findAllDotEnvFiles({ dotEnvFilesDirectory: TestFilesLocator.tests_fs_directory_location, logger: defaultTestLogger });

        expect(result).toEqual(
            filesList.map((item) => ({
                path: item.path,
                fileName: last(item.path.split('/')),
            })),
        );
    });
});

describe('getEnvironmentNameFromFileName', () => {
    test('should return environment name when given a valid .env file name', () => {
        const fileName = '.env.prod';

        const result = getEnvironmentNameFromFileName(fileName);

        expect(result).toBe('PROD');
    });

    test('should return empty string when given an invalid .env file name', () => {
        const fileName = '.env';

        const result = getEnvironmentNameFromFileName(fileName);

        expect(result).toBe(null);
    });
});
