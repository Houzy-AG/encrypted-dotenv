import * as fs from 'fs';
import { omit, pick } from 'lodash';
import * as path from 'path';
import { parse } from 'dotenv';
import { isNil } from '../utils';
import { decryptData, encryptData } from './encryption';
import { findAllDotEnvFiles, getEnvFilesDirectory, getEnvironmentNameFromFileName } from './file-system';
import { DefaultArguments } from './globals/default-arguments';
import { EncryptedDotEnvErrorCodes, failWithEncryptedFotEnvError } from './errors/encrypted-dot-env-error';
import { getVaultKeys, VaultKeys } from './vault-keys';
import { EnvVaultJsonData, DecryptedVault } from './vault-types';

export const readVaultFromDisk = (options: DefaultArguments): EnvVaultJsonData => {
    const envFilesDirectory = getEnvFilesDirectory(options);
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

export const writeVaultToDisk = (options: DefaultArguments & { envVaultContent: EnvVaultJsonData }): void => {
    const envFilesDirectory = getEnvFilesDirectory(options);
    fs.writeFileSync(path.join(envFilesDirectory, '.env-vault.json'), JSON.stringify(options.envVaultContent, null, 4));
};

export const writeEnvsToDisk = (options: DefaultArguments & { files: { environmentName: string; decryptedStringContent: string }[] }): void => {
    const envFilesDirectory = getEnvFilesDirectory(options);

    for (const { environmentName, decryptedStringContent } of options.files) {
        fs.writeFileSync(path.join(envFilesDirectory, `.env.${environmentName.toLowerCase()}`), decryptedStringContent);
    }
};

export const encryptEnvFilesToVault = (options: DefaultArguments & { envVaultKeys: VaultKeys }): EnvVaultJsonData => {
    const envVaultContent = readVaultFromDisk(options);

    const dotEnvFilesPath = findAllDotEnvFiles(options);

    for (const { path, fileName } of dotEnvFilesPath) {
        const environmentName = getEnvironmentNameFromFileName(fileName);
        if (!environmentName) {
            continue;
        }
        const vaultKey = options.envVaultKeys[environmentName];
        if (!vaultKey) {
            continue;
        }
        envVaultContent[environmentName] = encryptData({
            data: fs.readFileSync(path).toString('utf8'),
            ...vaultKey,
        });
    }

    return envVaultContent;
};

export const reEncryptCurrentVaultWithKeys = (
    options: DefaultArguments & {
        currentVaultKeys: VaultKeys;
        newVaultKeys: VaultKeys;
    },
): { envVaultKeys: VaultKeys; vaultContent: DecryptedVault } => {
    const currentVault = decryptVault({ ...omit(options, [`currentVaultKeys`, `newVaultKeys`]), envVaultKeys: options.currentVaultKeys });

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

export const decryptVault = (options: DefaultArguments & { envVaultKeys: VaultKeys }): DecryptedVault => {
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

export const decryptCurrentActiveEnvironment = (options: DefaultArguments & { currentEnvironment?: string }): EnvVaultJsonData => {
    const vaultKeys = getVaultKeys(options);
    let currentActiveEnvironmentName = options.currentEnvironment;
    if (!Object.keys(vaultKeys).length && !currentActiveEnvironmentName?.length) {
        // There are no vault keys and there is no environment set so we do not need to decrypt anything.
        return {};
    }

    if (!currentActiveEnvironmentName?.length) {
        if (Object.keys(vaultKeys).length > 1) {
            failWithEncryptedFotEnvError({
                message: [
                    `Missing ENVIRONMENT and more then one environment was decrypted.`,
                    `If you have multiple decryption keys specified in the current machine please specify which environment from the vault to use ENVIRONMENT={{environmentToUseFromVault}}`,
                ].join(' '),
                errorCode: EncryptedDotEnvErrorCodes.FAILED_TO_IDENTIFY_CURRENT_ENVIRONMENT_MULTIPLE_VAULT_KEYS,
            });
        }
        currentActiveEnvironmentName = Object.keys(vaultKeys)[0];
    }

    if (!vaultKeys?.[currentActiveEnvironmentName]) {
        failWithEncryptedFotEnvError({
            message: [
                `Missing decryption key for ENVIRONMENT: "${currentActiveEnvironmentName}"`,
                `If you have multiple decryption keys specified in the current machine please specify which environment from the vault to use ENVIRONMENT={{environmentToUseFromVault}}`,
            ].join(' '),
            errorCode: EncryptedDotEnvErrorCodes.FAILED_TO_DECRYPT_ENVIRONMENT_MISSING_DECRYPTION,
        });
    }
    const vaultVariables = decryptVault({ ...options, envVaultKeys: pick(vaultKeys, currentActiveEnvironmentName) });
    const decryptedEnvironments = Object.values(vaultVariables).filter((vaultData) => vaultData.decrypted);
    if (!decryptedEnvironments.length) {
        failWithEncryptedFotEnvError({
            message: [`Failed to decrypt ENVIRONMENT: "${currentActiveEnvironmentName}".`, `Check your decryption key`].join(' '),
            errorCode: EncryptedDotEnvErrorCodes.FAILED_TO_DECRYPT_ENVIRONMENT_INVALID_DECRYPTION_KEY,
        });
    }

    return decryptedEnvironments[0].data ?? {};
};
