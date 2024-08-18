import { parse } from 'dotenv';
import { isString } from 'lodash';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import * as os from 'node:os';
import { mergeRecordsWithValues } from '../../utils';
import { EncryptedEnvLogger } from '../logger/encrypted-env-logger';
import { ENV_KEYS_FILE_NAME, ENV_VAULT_BACKUP_FILE_NAME, ENV_VAULT_FILE_NAME, GENERAL_DOT_ENV_FILE_NAME } from './consts';

interface FileDescriptor {
    path: string;
    fileName: string;
}

interface WriteFileInput {
    fileName: string;
    // string   => Is written as it is in file
    // string[] => Is written in file joining them using os.EOL. (Useful for when we want to write a list of env vars)
    // Object   => will be serialized to json.
    content: string | string[] | object;
}

interface CopyFileInput {
    sourceFileName: string;
    destinationFileName: string;
}

export const PROTECTED_FILE_NAMES = [GENERAL_DOT_ENV_FILE_NAME, ENV_KEYS_FILE_NAME, ENV_VAULT_FILE_NAME, ENV_VAULT_BACKUP_FILE_NAME];

export class VaultFileSystem {
    private readonly dotEnvFilesDirectory: string;
    private readonly logger: EncryptedEnvLogger;

    constructor({ dotEnvFilesDirectory, logger }: { dotEnvFilesDirectory: string; logger: EncryptedEnvLogger }) {
        this.dotEnvFilesDirectory = dotEnvFilesDirectory?.length ? path.resolve(process.cwd(), dotEnvFilesDirectory) : process.cwd();
        this.logger = logger;

        this.logger.info(`[${VaultFileSystem.name}] Initialized, env files directory: "${this.dotEnvFilesDirectory}"`);
    }

    public findDotEnvFiles(): FileDescriptor[] {
        return fs
            .readdirSync(this.dotEnvFilesDirectory)
            .filter((fileName) => {
                return !PROTECTED_FILE_NAMES.includes(fileName) && fileName.startsWith('.env.');
            })
            .map((fileName) => ({
                path: path.resolve(this.dotEnvFilesDirectory, fileName),
                fileName: fileName,
            }));
    }

    // Return all env variables inside `process.env` + `.env` file.
    public getEnvVarsFromSystem(): Record<string, string | undefined> {
        return mergeRecordsWithValues([{ ...process.env }, this.parseEnvVarsFromFile(GENERAL_DOT_ENV_FILE_NAME)]);
    }

    public parseEnvVarsFromFile(fileName: string): Record<string, string | undefined> {
        const envFilePath = path.resolve(this.dotEnvFilesDirectory, fileName);
        if (fs.existsSync(envFilePath)) {
            return parse(fs.readFileSync(envFilePath));
        }
        return {};
    }

    public readJson<T>(fileName: string): Partial<T> {
        const vaultFilePath = path.resolve(this.dotEnvFilesDirectory, fileName);
        if (!fs.existsSync(vaultFilePath)) {
            this.logger.info(`File ${vaultFilePath} does not exist`);
            return {};
        }

        const vaultFileContent = fs.readFileSync(vaultFilePath).toString('utf8');
        try {
            if (vaultFileContent?.length) {
                return (JSON.parse(vaultFileContent) ?? {}) as T;
            }
            return {};
        } catch (e) {
            this.logger.info(`File ${vaultFilePath} content could not be parsed as JSON`, e);
            return {};
        }
    }

    public writeFile({ fileName, content }: WriteFileInput): void {
        let stringContent;
        if (isString(content)) {
            stringContent = content;
        } else if (Array.isArray(content) && content.every(isString)) {
            stringContent = content.join(os.EOL);
        } else {
            stringContent = JSON.stringify(content, null, 4);
        }

        fs.writeFileSync(path.join(this.dotEnvFilesDirectory, fileName), stringContent);
    }

    public copyFile({ sourceFileName, destinationFileName }: CopyFileInput): void {
        const destinationFilePath = path.join(this.dotEnvFilesDirectory, destinationFileName);
        if (fs.existsSync(destinationFilePath)) {
            fs.rmSync(destinationFilePath, { recursive: true, force: true });
        }
        const fileName = path.join(this.dotEnvFilesDirectory, sourceFileName);
        if (!fs.existsSync(fileName)) {
            this.logger.info(`Vault does not exist`);
            return;
        }

        fs.copyFileSync(fileName, destinationFilePath);
    }

    public readFileContent(filePath: string): string {
        return fs.readFileSync(filePath).toString('utf8');
    }

    public rmSync(filePath: string): void {
        return fs.rmSync(filePath, { recursive: true, force: true });
    }
}
