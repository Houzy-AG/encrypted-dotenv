import { parse } from 'dotenv';
import * as fs from 'fs';
import * as passwordGenerator from 'generate-password';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import { EncryptionDecryptionDetails } from './encryption';
import { findAllDotEnvFiles, getEnvFilesDirectory, getEnvironmentNameFromFileName, getEnvironmentVariableFromLocalDotEnvFile } from './file-system';
import { convertToUrl, isNil, isString, mergeRecordsWithValues } from '../utils';

export const VAULT_DECRYPTION_KEY_PREFIX = `VAULT_KEY_`;

export const getVaultKeysFromProcessEnv = (): Record<string, string> => {
    return Object.keys(process.env)
        .filter((key) => key.startsWith(VAULT_DECRYPTION_KEY_PREFIX))
        .reduce((acc: Record<string, string>, vaultKeyName: string) => {
            const vaultKeyValue = process.env[vaultKeyName];
            if (isString(vaultKeyValue)) {
                acc[vaultKeyName] = vaultKeyValue;
            }
            return acc;
        }, {} as Record<string, string>);
};

export const getVaultKeysFromLocalDotEnv = (dotEnvDirectoryName?: string): Record<string, string> => {
    const localDotEnv = getEnvironmentVariableFromLocalDotEnvFile(dotEnvDirectoryName);

    const out: Record<string, string> = {};
    for (const envVarName in localDotEnv) {
        if (envVarName.startsWith(VAULT_DECRYPTION_KEY_PREFIX)) {
            out[envVarName] = localDotEnv[envVarName];
        }
    }
    return out;
};

export type VaultKeys = Record<string, EncryptionDecryptionDetails | null>;

// We expect the vault keys to be encoded uri params because we do not want to invent our own encoding for them and we do not want to
// restrict specific characters.
export const decodeVaultKey = (vaultKey: string | undefined): { encryptionIV: string; encryptionKey: string } | null => {
    if (isNil(vaultKey)) {
        return null;
    }
    const keyDetails = convertToUrl(`https://env-keys.decription?${decodeURI(vaultKey)}`);
    const encryptionIV = keyDetails?.searchParams.get('encryptionIV');
    const encryptionKey = keyDetails?.searchParams.get('encryptionKey');

    if (!isString(encryptionIV) || !encryptionIV.length || !isString(encryptionKey) || !encryptionKey.length) {
        return null;
    }
    return { encryptionIV, encryptionKey };
};

export const encodeVaultKey = (data: { encryptionIV: string; encryptionKey: string }): string => {
    // In this case we type force because we know 100% that this url is valid.
    const keyAsUrl = convertToUrl(`https://env-keys.decription`) as unknown as URL;
    keyAsUrl.searchParams.set('encryptionIV', data.encryptionIV);
    keyAsUrl.searchParams.set('encryptionKey', data.encryptionKey);
    return `${encodeURI(keyAsUrl.search.substring(1, keyAsUrl.search.length))}`;
};

// Keys are passed in query params encoded format. Basically you have the following example
// encryptionIV = 'houzyDev'
// encryptionKey = 'houzyRocks2021'
// and the .env file has the name .env.local
// then in .env.keys you should have some this
// ENVIRONMENT_VARIABLE_VOLT_KEY_LOCAL=`{encodeURI(`encryptionIV=houzyDev&encryptionKey=houzyRocks2021`)}`
export const getVaultKeys = (options: { dotEnvFilesDirectory?: string }): VaultKeys => {
    const envFilesDirectory = getEnvFilesDirectory(options.dotEnvFilesDirectory);
    const envKeysFilePath = path.resolve(envFilesDirectory, '.env.keys');
    let encryptionDecryptionKeys: Record<string, string | undefined> = mergeRecordsWithValues([
        getVaultKeysFromProcessEnv(),
        getVaultKeysFromLocalDotEnv(options?.dotEnvFilesDirectory),
    ]);

    for (const vaultKeyName in Object.keys(process.env).filter((key) => key.startsWith(VAULT_DECRYPTION_KEY_PREFIX))) {
        const vaultKeyValue = process.env[vaultKeyName];
        if (isString(vaultKeyValue)) {
            encryptionDecryptionKeys[vaultKeyName] = vaultKeyValue;
        }
    }

    if (fs.existsSync(envKeysFilePath)) {
        encryptionDecryptionKeys = mergeRecordsWithValues([encryptionDecryptionKeys, parse(fs.readFileSync(envKeysFilePath))]);
    }

    const vaultKeys: VaultKeys = {};

    for (const vaultKeyName in encryptionDecryptionKeys) {
        const environmentName = vaultKeyName.replace(VAULT_DECRYPTION_KEY_PREFIX, '');
        const keyDetails = decodeVaultKey(encryptionDecryptionKeys[vaultKeyName]);
        if (isNil(keyDetails)) {
            continue;
        }

        vaultKeys[environmentName] = keyDetails;
    }

    return vaultKeys;
};

const encryptionKeyGeneratorOptions = {
    length: 128,
    numbers: true,
    uppercase: true,
    symbols: true,
    lowercase: true,
    excludeSimilarCharacters: true,
    strict: true,
};

export const generateKey = (): { encryptionKey: string; encryptionIV: string } => ({
    encryptionKey: passwordGenerator.generate(encryptionKeyGeneratorOptions),
    encryptionIV: passwordGenerator.generate(encryptionKeyGeneratorOptions),
});

export const generateKeysForEnvFiles = (options: { dotEnvFilesDirectory?: string }): VaultKeys => {
    const dotEnvFilesPath = findAllDotEnvFiles(options.dotEnvFilesDirectory);

    const envVaultKeys: VaultKeys = {};
    for (const { fileName } of dotEnvFilesPath) {
        const environmentName = getEnvironmentNameFromFileName(fileName);
        if (environmentName?.length) {
            envVaultKeys[environmentName] = generateKey();
        }
    }

    return envVaultKeys;
};

export const writeVaultKeysToDisk = (dotEnvFilesDirectory: string | undefined, vaultKeys: VaultKeys): void => {
    const vaultKeysList: string[] = [];
    for (const [environmentName, vaultKey] of Object.entries(vaultKeys)) {
        if (!isNil(vaultKey)) {
            vaultKeysList.push(`${VAULT_DECRYPTION_KEY_PREFIX}${environmentName}=${encodeVaultKey(vaultKey)}`);
        }
    }
    const envFilesDirectory = getEnvFilesDirectory(dotEnvFilesDirectory);
    fs.writeFileSync(path.join(envFilesDirectory, '.env.keys'), vaultKeysList.join(os.EOL));
};
