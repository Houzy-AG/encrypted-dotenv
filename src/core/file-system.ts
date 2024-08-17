import { parse } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { mergeRecordsWithValues } from '../utils';
import { DefaultArguments } from './globals/default-arguments';

export const getEnvFilesDirectory = ({ dotEnvFilesDirectory }: DefaultArguments): string => {
    return dotEnvFilesDirectory?.length ? path.resolve(process.cwd(), dotEnvFilesDirectory) : process.cwd();
};

// Return all env variables inside `process.env` + `.env` file.
export const getUnEncryptedEnvVars = (options: DefaultArguments): Record<string, string | undefined> => {
    const filePath = path.resolve(getEnvFilesDirectory(options), `.env`);
    let envVars = {};
    if (fs.existsSync(filePath)) {
        envVars = parse(fs.readFileSync(filePath));
    }
    return mergeRecordsWithValues([{ ...process.env }, envVars]);
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
