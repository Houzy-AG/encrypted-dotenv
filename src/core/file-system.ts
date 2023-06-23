import { parse } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';

export const getEnvFilesDirectory = (dotEnvFilesDirectory: string): string => {
    return dotEnvFilesDirectory?.length ? path.resolve(process.cwd(), dotEnvFilesDirectory) : process.cwd();
};

// Returns the env vars from .env file
export const getEnvironmentVariableFromLocalDotEnvFile = (dotEnvFilesDirectory: string): Record<string, string> => {
    const filePath = path.resolve(getEnvFilesDirectory(dotEnvFilesDirectory), `.env`);
    if (fs.existsSync(filePath)) {
        return parse(fs.readFileSync(filePath));
    }
    return {};
};

const protectedFileNames = ['.env', '.env.keys', '.env-vault.json'];

export const findAllDotEnvFiles = (dotEnvFilesDirectory: string): { path: string; fileName: string }[] => {
    const envFilesDirectory = getEnvFilesDirectory(dotEnvFilesDirectory);
    return fs
        .readdirSync(envFilesDirectory)
        .filter((fileName) => {
            return !protectedFileNames.includes(fileName) && fileName.startsWith('.env');
        })
        .map((fileName) => ({
            path: path.resolve(envFilesDirectory, fileName),
            fileName: fileName,
        }));
};

export const getEnvironmentNameFromFileName = (fileName: string): string => {
    if (!fileName.startsWith('.env.')) {
        return null;
    }

    return fileName.replace('.env.', '').toUpperCase();
};
