import { parse } from 'dotenv';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DOT_ENV_FILES_DIRECTORY_FOR_TESTING } from './setup-tests';

interface CreateTestFile {
    fileName: string;
    fileContent: string;
}

export const pathToTestFile = (fileName: string): string => path.join(DOT_ENV_FILES_DIRECTORY_FOR_TESTING, fileName);

export const existsTestFile = (fileName: string): boolean => existsSync(pathToTestFile(fileName));

export const readTestFileContent = (fileName: string): string => readFileSync(pathToTestFile(fileName)).toString('utf8');

export const readTestFileContentAsJson = (fileName: string): unknown | null => {
    const content = readTestFileContent(fileName);

    try {
        if (content?.length) {
            return JSON.parse(content);
        }
    } catch (e) {
        return null;
    }
    return null;
};

export const readTestFileContentAsEnvVars = (fileName: string): Record<string, string | undefined> => parse(readTestFileContent(fileName));

export const removeTestFile = (fileName: string) => rmSync(pathToTestFile(fileName), { recursive: true, force: true });

export const createTestFile = ({ fileName, fileContent }: CreateTestFile): void => {
    writeFileSync(pathToTestFile(fileName), fileContent, {});
};

export interface CreateDotEnvFile {
    fileName: `.env` | `.env.${string}`;
    envVars: string[];
}

export const createDotEnvTestFiles = (files: CreateDotEnvFile[]): void => {
    files.forEach(({ fileName, envVars }) => createTestFile({ fileName, fileContent: envVars.join(os.EOL) }));
};
