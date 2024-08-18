import { test, describe, expect, beforeEach } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { EOL } from 'node:os';
import { join } from 'node:path';
import { isEqual, isObject, last } from 'lodash';
import { defaultTestLogger } from '../logger/encrypted-env-logger';
import { CreateDotEnvFile, createDotEnvTestFile, createDotEnvTestFiles, createTestFile } from '../test-utils/create-test-file';
import { setupTests, DOT_ENV_FILES_DIRECTORY_FOR_TESTING } from '../test-utils/setup-tests';
import { VaultFileSystem } from './vault-file-system';

setupTests();

let vaultFileSystem: VaultFileSystem;

beforeEach(() => {
    vaultFileSystem = new VaultFileSystem({
        dotEnvFilesDirectory: DOT_ENV_FILES_DIRECTORY_FOR_TESTING,
        logger: defaultTestLogger,
    });
});

describe(VaultFileSystem.name, () => {
    describe(VaultFileSystem.prototype.findDotEnvFiles.name, () => {
        test('should return an empty array when no .env files are found', () => {
            const result = vaultFileSystem.findDotEnvFiles();

            expect(result).toEqual([]);
        });

        test('should return an array of file paths and names for found .env files', () => {
            const filesList: CreateDotEnvFile[] = [
                {
                    fileName: `.env.local`,
                    envVars: [`VAR_ONE=1`, `VAR_TWO=2`],
                },
                {
                    fileName: `.env.test`,
                    envVars: [`VAR_THREE=3`, `VAR_THREE=3`],
                },
            ];
            createDotEnvTestFiles(filesList);

            const result = vaultFileSystem.findDotEnvFiles();

            expect(result).toEqual(
                filesList.map((item) => ({
                    path: item.fileName,
                    fileName: last(item.fileName.split('/')),
                })),
            );
        });
    });

    describe(VaultFileSystem.prototype.getEnvVarsFromSystem.name, () => {
        test('should return an object if we do not have a .env file', () => {
            const envVarsFromSystem = vaultFileSystem.getEnvVarsFromSystem();
            expect(isObject(envVarsFromSystem)).toBe(true);
        });

        test('should return env vars from .env if there is a .env file', () => {
            createDotEnvTestFile({
                fileName: `.env`,
                envVars: [`TEST_ENV_VAR=some-env-var`],
            });

            const envVarsFromSystem = vaultFileSystem.getEnvVarsFromSystem();
            expect(envVarsFromSystem?.TEST_ENV_VAR).toBe(`some-env-var`);
        });
    });

    describe(VaultFileSystem.prototype.parseEnvVarsFromFile.name, () => {
        test(`should parse env vars variables from some env file`, () => {
            createDotEnvTestFile({
                fileName: `.env.test`,
                envVars: [`TEST_ENV_VAR=some-env-var`],
            });
            const envVars = vaultFileSystem.parseEnvVarsFromFile(`.env.test`);
            expect(envVars.TEST_ENV_VAR).toBe(`some-env-var`);
        });
    });

    describe(VaultFileSystem.prototype.readJson.name, () => {
        test(`should return an empty object if the file does not exist`, () => {
            const jsonContent = vaultFileSystem.readJson(`this_file_does_not_exist`);
            expect(isObject(jsonContent)).toBe(true);
            expect(Object.keys(jsonContent).length).toBe(0);
        });

        test(`should return an empty object if the file contains an invalid json`, () => {
            createTestFile({
                fileName: `test-file.json`,
                fileContent: `some-random-stuff`,
            });
            const jsonContent = vaultFileSystem.readJson(`this_file_does_not_exist`);
            expect(isObject(jsonContent)).toBe(true);
            expect(Object.keys(jsonContent).length).toBe(0);
        });

        test(`should return the json object if the file contains a valid json`, () => {
            const testJSON = {
                a: 'test',
                data: 'test',
                value: [1, 2, 3],
            };
            createTestFile({
                fileName: `test-file.json`,
                fileContent: JSON.stringify(testJSON),
            });
            const jsonContent = vaultFileSystem.readJson(`this_file_does_not_exist`);
            expect(isEqual(jsonContent, testJSON)).toBe(true);
        });
    });

    describe(VaultFileSystem.prototype.writeFile.name, () => {
        test(`should create a file with the specified string content`, () => {
            const fileName = `test_file_name`;
            const testContent = `Lorem Ipsum`;
            vaultFileSystem.writeFile({ fileName, content: testContent });
            expect(existsSync(join(DOT_ENV_FILES_DIRECTORY_FOR_TESTING, fileName))).toBe(true);
            expect(readFileSync(join(DOT_ENV_FILES_DIRECTORY_FOR_TESTING, fileName).toString())).toBe(testContent);
        });

        test(`should create a file with the content separated by newlines if the content is a string array`, () => {
            const fileName = `test_file_name`;
            const testContent = [`Lorem Ipsum`, `Lorem Ipsum 2`, `Lorem Ipsum 3`];
            vaultFileSystem.writeFile({ fileName, content: testContent });
            expect(existsSync(join(DOT_ENV_FILES_DIRECTORY_FOR_TESTING, fileName))).toBe(true);
            expect(readFileSync(join(DOT_ENV_FILES_DIRECTORY_FOR_TESTING, fileName).toString())).toBe(testContent.join(EOL));
        });

        test(`should create a file with a json object if content is a json object`, () => {
            const fileName = `test_file_name`;
            const testContent = ['test', { key1: 'value' }];
            vaultFileSystem.writeFile({ fileName, content: testContent });
            expect(existsSync(join(DOT_ENV_FILES_DIRECTORY_FOR_TESTING, fileName))).toBe(true);
            expect(readFileSync(join(DOT_ENV_FILES_DIRECTORY_FOR_TESTING, fileName).toString())).toBe(JSON.stringify(testContent, null, 4));
        });
    });

    describe(VaultFileSystem.prototype.copyFile.name, () => {});
});
