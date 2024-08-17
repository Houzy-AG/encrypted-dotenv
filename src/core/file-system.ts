import { parse } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { mergeRecordsWithValues } from '../utils';
import { DefaultArguments } from './globals/default-arguments';

export const GENERAL_DOT_ENV_FILE_NAME = `.env`;
export const ENV_KEYS_FILE_NAME = `.env.keys`;
export const ENV_VAULT_FILE_NAME = `.env-vault.json`;
export const ENV_VAULT_BACKUP_FILE_NAME = `.env-vault-backup.json`;

export type PossibleVaultFileNames = typeof ENV_VAULT_FILE_NAME | typeof ENV_VAULT_BACKUP_FILE_NAME;

export const getEnvFilesDirectory = ({ dotEnvFilesDirectory }: DefaultArguments): string => {
    return dotEnvFilesDirectory?.length ? path.resolve(process.cwd(), dotEnvFilesDirectory) : process.cwd();
};

// Return all env variables inside `process.env` + `.env` file.
export const getUnEncryptedEnvVars = (options: DefaultArguments): Record<string, string | undefined> => {
    const filePath = path.resolve(getEnvFilesDirectory(options), GENERAL_DOT_ENV_FILE_NAME);
    let envVars = {};
    if (fs.existsSync(filePath)) {
        envVars = parse(fs.readFileSync(filePath));
    }
    return mergeRecordsWithValues([{ ...process.env }, envVars]);
};

const protectedFileNames = [GENERAL_DOT_ENV_FILE_NAME, ENV_KEYS_FILE_NAME, ENV_VAULT_FILE_NAME, ENV_VAULT_BACKUP_FILE_NAME];

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
