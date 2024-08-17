import { parse } from 'dotenv';
import * as fs from 'fs';
import { difference, intersection, isEqual, omit, pick } from 'lodash';
import * as path from 'path';
import { decryptData, encryptData } from './encryption';
import { EncryptedDotEnvErrorCodes, failWithEncryptedFotEnvError } from './errors/encrypted-dot-env-error';
import {
    ENV_VAULT_BACKUP_FILE_NAME,
    ENV_VAULT_FILE_NAME,
    findAllDotEnvFiles,
    getEnvFilesDirectory,
    getEnvironmentNameFromFileName,
    PossibleVaultFileNames,
} from './file-system';
import { DefaultArguments } from './globals/default-arguments';
import { getVaultKeys, VaultKeys } from './vault-keys';
import { DecryptedVault, DecryptedVaultInfo, EnvVaultJsonData } from './vault-types';

export const readVaultFromDisk = (
    options: DefaultArguments & {
        vaultFileName: PossibleVaultFileNames;
    },
): EnvVaultJsonData => {
    const vaultFileName = options?.vaultFileName ?? ENV_VAULT_FILE_NAME;
    const envFilesDirectory = getEnvFilesDirectory(options);
    const vaultFilePath = path.resolve(envFilesDirectory, vaultFileName);
    if (!fs.existsSync(vaultFilePath)) {
        options.logger.info(`File ${vaultFileName} does not exist. Vault considered as empty`);
        return {};
    }

    const vaultFileContent = fs.readFileSync(vaultFilePath).toString('utf8');
    try {
        return JSON.parse(vaultFileContent) as EnvVaultJsonData;
    } catch (e) {
        options.logger.error(`Vault content could not be parsed`, e);
        return {};
    }
};

export const writeVaultToDisk = (
    options: DefaultArguments & {
        vaultFileName: PossibleVaultFileNames;
        envVaultContent: EnvVaultJsonData;
    },
): void => {
    const envFilesDirectory = getEnvFilesDirectory(options);
    const vaultFileName = options.vaultFileName ?? ENV_VAULT_FILE_NAME;
    fs.writeFileSync(path.join(envFilesDirectory, vaultFileName), JSON.stringify(options.envVaultContent, null, 4));
};

export const backupVault = (options: DefaultArguments): void => {
    const envFilesDirectory = getEnvFilesDirectory(options);
    const backupFilePath = path.join(envFilesDirectory, ENV_VAULT_BACKUP_FILE_NAME);
    if (fs.existsSync(backupFilePath)) {
        fs.rmSync(backupFilePath, { recursive: true, force: true });
    }
    const fileName = path.join(envFilesDirectory, ENV_VAULT_FILE_NAME);
    if (!fs.existsSync(fileName)) {
        options.logger.info(`Vault does not exist`);
        return;
    }

    fs.copyFileSync(fileName, backupFilePath);
};

export const writeEnvsToDisk = (options: DefaultArguments & { files: { environmentName: string; decryptedStringContent: string }[] }): void => {
    const envFilesDirectory = getEnvFilesDirectory(options);

    for (const { environmentName, decryptedStringContent } of options.files) {
        fs.writeFileSync(path.join(envFilesDirectory, `.env.${environmentName.toLowerCase()}`), decryptedStringContent);
    }
};

export const encryptEnvFilesToVault = (
    options: DefaultArguments & {
        vaultFileName: PossibleVaultFileNames;
        envVaultKeys: VaultKeys;
    },
): EnvVaultJsonData => {
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
        vaultFileName: PossibleVaultFileNames;
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

export const decryptVault = (
    options: DefaultArguments & {
        vaultFileName: PossibleVaultFileNames;
        envVaultKeys: VaultKeys;
    },
): DecryptedVault => {
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

        options.logger.log(`Environment: ${environmentName}. Decrypted successfully`);
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

export const decryptCurrentActiveEnvironment = (
    options: DefaultArguments & {
        vaultFileName: PossibleVaultFileNames;
        currentEnvironment?: string;
    },
): EnvVaultJsonData => {
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
export type VaultDiff =
    | {
          type: 'environment-diff';
          environmentName: string;
          fileName: string;
          vaultInfo: DecryptedVaultInfo;
      }
    | {
          type: 'env-var-diff';
          environmentName: string;
          envVarName: string;
          left: { fileName: string; value: string };
          right: { fileName: string; value: string };
      };

export interface VaultDifferenceOverview {
    mainVault: DecryptedVault;
    diffs: VaultDiff[];
}

export const getDifferencesBetweenVaults = (
    options: DefaultArguments & {
        envVaultKeys: VaultKeys;
    },
): VaultDifferenceOverview => {
    const mainVault = decryptVault({ ...options, vaultFileName: ENV_VAULT_FILE_NAME });
    const backupVault = decryptVault({ ...options, vaultFileName: ENV_VAULT_BACKUP_FILE_NAME });

    const processedEnvs = new Set<string>([]);

    const getVaultDifference = (
        left: {
            fileName: string;
            vault: DecryptedVault;
        },
        right: {
            fileName: string;
            vault: DecryptedVault;
        },
    ): VaultDiff[] => {
        const vaultDiffs: VaultDiff[] = [];

        for (const environmentName in left.vault) {
            if (processedEnvs.has(environmentName)) {
                continue;
            }

            if (!right.vault[environmentName]) {
                vaultDiffs.push({ type: 'environment-diff', environmentName, fileName: left.fileName, vaultInfo: left.vault[environmentName] });
                processedEnvs.add(environmentName);
                continue;
            }

            if (!left.vault[environmentName].decrypted) {
                failWithEncryptedFotEnvError({
                    message: `Missing decryption key for environment. ${environmentName} from ${ENV_VAULT_FILE_NAME} could not be decrypted.`,
                    errorCode: EncryptedDotEnvErrorCodes.MISSING_DECRYPTION_KEY_FOR_ENVIRONMENT,
                });
            }

            if (!right.vault[environmentName].decrypted) {
                failWithEncryptedFotEnvError({
                    message: `Missing decryption key for environment. ${environmentName} from ${ENV_VAULT_BACKUP_FILE_NAME} could not be decrypted.`,
                    errorCode: EncryptedDotEnvErrorCodes.MISSING_DECRYPTION_KEY_FOR_ENVIRONMENT,
                });
            }

            const leftVaultData = left.vault[environmentName].data ?? {};
            const rightVaultData = right.vault[environmentName].data ?? {};

            const commonEnvVars = intersection(Object.keys(leftVaultData), Object.keys(rightVaultData));
            for (const envVarName of commonEnvVars) {
                if (isEqual(leftVaultData[envVarName], rightVaultData[envVarName])) {
                    continue;
                }
                vaultDiffs.push({
                    type: 'env-var-diff',
                    environmentName,
                    envVarName,
                    left: { fileName: left.fileName, value: leftVaultData[envVarName] },
                    right: { fileName: right.fileName, value: rightVaultData[envVarName] },
                });
            }

            const leftExtraEnvVars = difference(Object.keys(leftVaultData), Object.keys(rightVaultData));
            for (const envVarName of leftExtraEnvVars) {
                vaultDiffs.push({
                    type: 'env-var-diff',
                    environmentName,
                    envVarName,
                    left: { fileName: left.fileName, value: leftVaultData[envVarName] },
                    right: { fileName: right.fileName, value: `` },
                });
            }
            const rightExtraEnvVars = difference(Object.keys(rightVaultData), Object.keys(leftVaultData));
            for (const envVarName of rightExtraEnvVars) {
                vaultDiffs.push({
                    type: 'env-var-diff',
                    environmentName,
                    envVarName,
                    left: { fileName: left.fileName, value: `` },
                    right: { fileName: right.fileName, value: rightVaultData[envVarName] },
                });
            }
            processedEnvs.add(environmentName);
        }

        return vaultDiffs;
    };

    const allDiffs = [
        ...getVaultDifference({ fileName: ENV_VAULT_FILE_NAME, vault: mainVault }, { fileName: ENV_VAULT_BACKUP_FILE_NAME, vault: backupVault }),
        ...getVaultDifference({ fileName: ENV_VAULT_BACKUP_FILE_NAME, vault: backupVault }, { fileName: ENV_VAULT_FILE_NAME, vault: mainVault }),
    ];

    return {
        mainVault,
        diffs: [...allDiffs.filter((diff) => diff.type === 'environment-diff'), ...allDiffs.filter((diff) => diff.type !== 'environment-diff')],
    };
};
