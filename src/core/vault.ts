import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'dotenv';
import { decryptData, encryptData } from './encryption';
import { findAllDotEnvFiles, getEnvFilesDirectory, getEnvironmentNameFromFileName } from './file-system';
import { VaultKeys } from './vault-keys';
import { EnvVaultJsonData, DecryptedVault } from './vault-types';

export const readVaultFromDisk = (options: { dotEnvFilesDirectory?: string }): EnvVaultJsonData => {
    const envFilesDirectory = getEnvFilesDirectory(options.dotEnvFilesDirectory);
    const vaultFilePath = path.resolve(envFilesDirectory, '.env-vault.json');
    if (!fs.existsSync(vaultFilePath)) {
        console.info(`File .env-vault.json does not exist. Vault considered as empty`);
        return {};
    }

    const vaultFileContent = fs.readFileSync(vaultFilePath).toString('utf8');
    try {
        return JSON.parse(vaultFileContent) as EnvVaultJsonData;
    } catch (e) {
        console.error(`Vault content could not be parsed`, e);
        return {};
    }
};

export const writeVaultToDisk = (dotEnvFilesDirectory: string | undefined, envVaultContent: EnvVaultJsonData): void => {
    const envFilesDirectory = getEnvFilesDirectory(dotEnvFilesDirectory);
    fs.writeFileSync(path.join(envFilesDirectory, '.env-vault.json'), JSON.stringify(envVaultContent, null, 4));
};

export const writeEnvsToDisk = (
    dotEnvFilesDirectory: string | undefined,
    files: { environmentName: string; decryptedStringContent: string }[],
): void => {
    const envFilesDirectory = getEnvFilesDirectory(dotEnvFilesDirectory);

    for (const { environmentName, decryptedStringContent } of files) {
        fs.writeFileSync(path.join(envFilesDirectory, `.env.${environmentName.toLowerCase()}`), decryptedStringContent);
    }
};

export const encryptEnvFilesToVault = (options: { dotEnvFilesDirectory?: string; envVaultKeys: VaultKeys }): EnvVaultJsonData => {
    const envVaultContent = readVaultFromDisk(options);

    const dotEnvFilesPath = findAllDotEnvFiles(options.dotEnvFilesDirectory);

    for (const { path, fileName } of dotEnvFilesPath) {
        const environmentName = getEnvironmentNameFromFileName(fileName);
        if (!environmentName) {
            continue;
        }
        const vaultKey = options.envVaultKeys[environmentName];
        if (!vaultKey) {
            continue;
        }
        console.log(`Environment: ${environmentName}. Encrypted successfully`);
        envVaultContent[environmentName] = encryptData({
            data: fs.readFileSync(path).toString('utf8'),
            ...vaultKey,
        });
    }

    return envVaultContent;
};

export const reEncryptCurrentVaultWithKeys = (options: {
    dotEnvFilesDirectory?: string;
    currentVaultKeys: VaultKeys;
    newVaultKeys: VaultKeys;
}): { envVaultKeys: VaultKeys; vaultContent: DecryptedVault } => {
    const currentVault = decryptVault({ dotEnvFilesDirectory: options.dotEnvFilesDirectory, envVaultKeys: options.currentVaultKeys });

    const vaultContent = { ...currentVault };
    const envVaultKeys = { ...options.currentVaultKeys };

    for (const environmentName in currentVault) {
        const newVaultKey = options.newVaultKeys[environmentName];
        if (!currentVault[environmentName]?.decrypted || !newVaultKey) {
            continue;
        }

        vaultContent[environmentName].encryptedStringContent = encryptData({
            data: vaultContent[environmentName].decryptedStringContent,
            ...newVaultKey,
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
        const vaultKey = options.envVaultKeys[environmentName];

        if (!vaultKey) {
            continue;
        }

        console.log(`Environment: ${environmentName}. Decrypted successfully`);
        const decryptedEnvVars = decryptData({
            data: envVaultContent[environmentName],
            ...vaultKey,
        });
        envVaultContentDecrypted[environmentName].data = parse(decryptedEnvVars);
        envVaultContentDecrypted[environmentName].decryptedStringContent = decryptedEnvVars;
        envVaultContentDecrypted[environmentName].decrypted = true;
    }
    return envVaultContentDecrypted;
};
