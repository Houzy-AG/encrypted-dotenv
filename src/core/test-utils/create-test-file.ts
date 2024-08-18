import { writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DOT_ENV_FILES_DIRECTORY_FOR_TESTING } from './setup-tests';

interface CreateTestFile {
    fileName: string;
    fileContent: string;
}

export const createTestFile = ({ fileName, fileContent }: CreateTestFile): void => {
    writeFileSync(path.join(DOT_ENV_FILES_DIRECTORY_FOR_TESTING, fileName), fileContent, {});
};

export interface CreateDotEnvFile {
    fileName: `.env` | `.env.${string}`;
    envVars: string[];
}

export const createDotEnvTestFile = ({ fileName, envVars }: CreateDotEnvFile): void => {
    createTestFile({ fileName, fileContent: envVars.join(os.EOL) });
};

export const createDotEnvTestFiles = (files: CreateDotEnvFile[]): void => {
    files.forEach(createDotEnvTestFile);
};
