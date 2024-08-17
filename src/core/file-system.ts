import { parse } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { DefaultArguments } from './globals/default-arguments';

export const getEnvFilesDirectory = ({ dotEnvFilesDirectory }: DefaultArguments): string => {
    return dotEnvFilesDirectory?.length ? path.resolve(process.cwd(), dotEnvFilesDirectory) : process.cwd();
};

// Returns the env vars from .env file
export const getEnvironmentVariableFromLocalDotEnvFile = (props: DefaultArguments): Record<string, string> => {
    const filePath = path.resolve(getEnvFilesDirectory(props), `.env`);
    if (fs.existsSync(filePath)) {
        return parse(fs.readFileSync(filePath));
    }
    return {};
};

const protectedFileNames = ['.env', '.env.keys', '.env-vault.json'];

export const findAllDotEnvFiles = (props: DefaultArguments): { path: string; fileName: string }[] => {
    const envFilesDirectory = getEnvFilesDirectory(props);
    return fs
        .readdirSync(envFilesDirectory)
        .filter((fileName) => {
            return !protectedFileNames.includes(fileName) && fileName.startsWith('.env.');
        })
        .map((fileName) => ({
            path: path.resolve(envFilesDirectory, fileName),
            fileName: fileName,
        }));
};

export const getEnvironmentNameFromFileName = (fileName: string): string | null => {
    if (!fileName.startsWith('.env.')) {
        return null;
    }

    return fileName.replace('.env.', '').toUpperCase();
};
