import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'dotenv';
import { decryptData, encryptData } from './encryption';
import { findAllDotEnvFiles, getEnvFilesDirectory, getEnvironmentNameFromFileName } from './file-system';
import { VaultKeys } from './vault-keys';
import { DecodedVault, DecryptedVault } from './vault-types';

const readVaultFromDisk = (options: { dotEnvFilesDirectory?: string }): DecodedVault => {
    const envFilesDirectory = getEnvFilesDirectory(options.dotEnvFilesDirectory);
    const vaultFilePath = path.resolve(envFilesDirectory, '.env-vault.json');
    if (!fs.existsSync(vaultFilePath)) {
        console.info(`File .env-vault.json does not exist. Vault considered as empty`);
        return {};
    }

    const vaultFileContent = fs.readFileSync(vaultFilePath).toString('utf8');
    try {
        return JSON.parse(vaultFileContent);
    } catch (e) {
        console.error(`Vault content could not be parsed`, e);
        return {};
    }
};

export const writeVaultToDisk = (dotEnvFilesDirectory: string, envVaultContent: DecodedVault): void => {
    const envFilesDirectory = getEnvFilesDirectory(dotEnvFilesDirectory);
    fs.writeFileSync(path.join(envFilesDirectory, '.env-vault.json'), JSON.stringify(envVaultContent, null, 4));
};

export const writeEnvsToDisk = (dotEnvFilesDirectory: string, files: { environmentName: string; decryptedStringContent: string }[]): void => {
    const envFilesDirectory = getEnvFilesDirectory(dotEnvFilesDirectory);

    for (const { environmentName, decryptedStringContent } of files) {
        fs.writeFileSync(path.join(envFilesDirectory, `.env.${environmentName.toLowerCase()}`), decryptedStringContent);
    }
};

export const encryptEnvFilesToVault = (options: { dotEnvFilesDirectory?: string; envVaultKeys: VaultKeys }): DecodedVault => {
    const envVaultContent = readVaultFromDisk(options);

    const dotEnvFilesPath = findAllDotEnvFiles(options.dotEnvFilesDirectory);

    for (const { path, fileName } of dotEnvFilesPath) {
        const environmentName = getEnvironmentNameFromFileName(fileName);
        if (!environmentName) {
            continue;
        }
        if (!options.envVaultKeys[environmentName]) {
            console.log(`Skip encrypting file environment: ${environmentName}. Encryption / Decryption key is missing`);
        }

        envVaultContent[environmentName] = encryptData({
            data: fs.readFileSync(path).toString('utf8'),
            ...options.envVaultKeys[environmentName],
        });
    }

    return envVaultContent;
};

export const encryptVaultWithKeys = (options: {
    dotEnvFilesDirectory?: string;
    currentVaultKeys: VaultKeys;
    newVaultKeys: VaultKeys;
}): { envVaultKeys: VaultKeys; vaultContent: DecryptedVault } => {
    const currentVault = decryptVault({ dotEnvFilesDirectory: options.dotEnvFilesDirectory, envVaultKeys: options.currentVaultKeys });

    const vaultContent = { ...currentVault };
    const envVaultKeys = { ...options.currentVaultKeys };

    for (const environmentName in currentVault) {
        if (!currentVault[environmentName]?.decrypted || !options.newVaultKeys[environmentName]) {
            continue;
        }

        vaultContent[environmentName].encryptedStringContent = encryptData({
            data: vaultContent[environmentName].decryptedStringContent,
            ...options.newVaultKeys[environmentName],
        });
        envVaultKeys[environmentName] = options.newVaultKeys[environmentName];
    }
    return { envVaultKeys, vaultContent };
};

export const decryptVault = (options: { dotEnvFilesDirectory?: string; envVaultKeys: VaultKeys }): DecryptedVault => {
    const envVaultContent = readVaultFromDisk(options);

    const envVaultContentDecrypted: DecryptedVault = {};

    for (const environmentName in envVaultContent) {
        envVaultContentDecrypted[environmentName] = {
            environmentName: environmentName,
            decrypted: false,
            data: null,
            encryptedStringContent: envVaultContent[environmentName],
            decryptedStringContent: ``,
        };

        if (!options.envVaultKeys[environmentName]) {
            console.log(`Skip overriding environment: ${environmentName}. Encryption / Decryption key is missing`);
            continue;
        }

        const decryptedEnvVars = decryptData({
            data: envVaultContent[environmentName],
            ...options.envVaultKeys[environmentName],
        });
        envVaultContentDecrypted[environmentName].data = parse(decryptedEnvVars);
        envVaultContentDecrypted[environmentName].decryptedStringContent = decryptedEnvVars;
        envVaultContentDecrypted[environmentName].decrypted = true;
    }
    return envVaultContentDecrypted;
};
