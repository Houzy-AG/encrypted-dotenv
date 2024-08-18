import { parse } from 'dotenv';
import { cloneDeep, difference, intersection, isEqual, pick } from 'lodash';
import process from 'process';
import { EnvironmentDiffOption, EnvVarDiffOption } from '../../cli/commands/merge-backup-with-main.command';
import { MergeConflictQuestion } from '../../cli/interactive-command-line-ui';
import { mergeRecordsWithValues } from '../../utils';
import { decryptData, encryptData } from '../encryption/encryption';
import { EncryptedDotEnvErrorCodes, failWithEncryptedFotEnvError } from '../errors/encrypted-dot-env-error';
import { EncryptedEnvLogger } from '../logger/encrypted-env-logger';
import { ENV_VAULT_BACKUP_FILE_NAME, ENV_VAULT_FILE_NAME, PossibleVaultFileNames } from '../vault-file-system/consts';
import { mapDotEnvFileNameToEnvironmentName } from '../vault-file-system/map-dot-env-file-name-to-environment-name';
import { VaultFileSystem } from '../vault-file-system/vault-file-system';
import { VaultKeys, VaultKeysManager } from '../vault-keys-manager/vault-keys-manager';
import { VaultDiff, VaultDifferenceOverview } from './vault-diff-types';
import { DecryptedVault, EnvVaultJsonData } from './vault-types';

export class VaultEnvironmentsManager {
    private vaultFileSystem: VaultFileSystem;
    public readonly vaultKeysManager: VaultKeysManager;
    private logger: EncryptedEnvLogger;
    private vaultFileName: string;
    private vaultBackupFileName: string;

    constructor({
        vaultFileSystem,
        vaultKeysManager,
        logger,
    }: {
        vaultFileSystem: VaultFileSystem;
        vaultKeysManager: VaultKeysManager;
        logger: EncryptedEnvLogger;
    }) {
        this.vaultFileName = ENV_VAULT_FILE_NAME;
        this.vaultBackupFileName = ENV_VAULT_BACKUP_FILE_NAME;
        this.vaultFileSystem = vaultFileSystem;
        this.vaultKeysManager = vaultKeysManager;
        this.logger = logger;
    }

    private readVaultData(): EnvVaultJsonData {
        return this.vaultFileSystem.readJson<EnvVaultJsonData>(this.vaultFileName) as EnvVaultJsonData;
    }

    private saveVaultData(data: { type: 'EnvVaultJsonData'; content: EnvVaultJsonData } | { type: 'DecryptedVault'; content: DecryptedVault }) {
        let envVaultJsonData: EnvVaultJsonData = {};

        if (data.type === 'EnvVaultJsonData') {
            envVaultJsonData = data.content;
        } else if (data.type === 'DecryptedVault') {
            envVaultJsonData = Object.values(data.content).reduce((acc, { environmentName, encryptedStringContent }) => {
                acc[environmentName] = encryptedStringContent;
                return acc;
            }, {} as EnvVaultJsonData);
        }
        this.vaultFileSystem.writeFile({ fileName: this.vaultFileName, content: envVaultJsonData });
    }

    private decryptEnvironmentOrDefault(environmentName: string) {
        const encryptionKeys = this.vaultKeysManager.readEncryptionKeys();
        let currentActiveEnvironmentName = environmentName;
        if (!Object.keys(encryptionKeys).length && !currentActiveEnvironmentName?.length) {
            // There are no vault keys and there is no environment set so we do not need to decrypt anything.
            return {};
        }

        if (!currentActiveEnvironmentName?.length) {
            if (Object.keys(encryptionKeys).length > 1) {
                failWithEncryptedFotEnvError({
                    message: [
                        `Missing ENVIRONMENT and more then one environment was decrypted.`,
                        `If you have multiple decryption keys specified in the current machine please specify which environment from the vault to use ENVIRONMENT={{environmentToUseFromVault}}`,
                    ].join(' '),
                    errorCode: EncryptedDotEnvErrorCodes.FAILED_TO_IDENTIFY_CURRENT_ENVIRONMENT_MULTIPLE_VAULT_KEYS,
                });
            }
            currentActiveEnvironmentName = Object.keys(encryptionKeys)[0];
        }

        if (!encryptionKeys?.[currentActiveEnvironmentName]) {
            failWithEncryptedFotEnvError({
                message: [
                    `Missing decryption key for ENVIRONMENT: "${currentActiveEnvironmentName}"`,
                    `If you have multiple decryption keys specified in the current machine please specify which environment from the vault to use ENVIRONMENT={{environmentToUseFromVault}}`,
                ].join(' '),
                errorCode: EncryptedDotEnvErrorCodes.FAILED_TO_DECRYPT_ENVIRONMENT_MISSING_DECRYPTION,
            });
        }
        const vaultVariables = this.decryptEnvironmentsVault({ encryptionKeysByEnvironment: pick(encryptionKeys, currentActiveEnvironmentName) });
        const decryptedEnvironments = Object.values(vaultVariables).filter((vaultData) => vaultData.decrypted);
        if (!decryptedEnvironments.length) {
            failWithEncryptedFotEnvError({
                message: [`Failed to decrypt ENVIRONMENT: "${currentActiveEnvironmentName}".`, `Check your decryption key`].join(' '),
                errorCode: EncryptedDotEnvErrorCodes.FAILED_TO_DECRYPT_ENVIRONMENT_INVALID_DECRYPTION_KEY,
            });
        }

        return decryptedEnvironments[0].data ?? {};
    }

    private decryptEnvironmentsVault({ encryptionKeysByEnvironment }: { encryptionKeysByEnvironment: VaultKeys }): DecryptedVault {
        const envVaultContent = this.readVaultData();

        const envVaultContentDecrypted: DecryptedVault = {};

        for (const environmentName in envVaultContent) {
            envVaultContentDecrypted[environmentName] = {
                environmentName: environmentName,
                decrypted: false,
                data: null,
                encryptedStringContent: envVaultContent[environmentName],
                decryptedStringContent: ``,
            };
            const vaultKey = encryptionKeysByEnvironment[environmentName];

            if (!vaultKey) {
                continue;
            }

            this.logger.log(`Environment: ${environmentName}. Decrypted successfully`);
            const decryptedEnvVars = decryptData({
                data: envVaultContent[environmentName],
                ...vaultKey,
            });
            envVaultContentDecrypted[environmentName].data = parse(decryptedEnvVars);
            envVaultContentDecrypted[environmentName].decryptedStringContent = decryptedEnvVars;
            envVaultContentDecrypted[environmentName].decrypted = true;
        }
        return envVaultContentDecrypted;
    }

    // => V2 api

    public configureProcessEnv(): void {
        const unEncryptedEnvVars = this.vaultFileSystem.getEnvVarsFromSystem();

        const correctEnvVars = mergeRecordsWithValues([
            this.vaultFileSystem.getEnvVarsFromSystem(),
            this.decryptEnvironmentOrDefault((unEncryptedEnvVars.ENVIRONMENT ?? ``).toUpperCase()),
        ]);
        for (const key in correctEnvVars) {
            process.env[key] = correctEnvVars[key];
        }
    }

    public reCreate(): void {
        // Cleanup vault files
        this.vaultFileSystem.rmSync(this.vaultFileName);
        this.vaultFileSystem.rmSync(this.vaultBackupFileName);

        // Create new encryption keys
        this.vaultKeysManager.reCreate();

        // Add all env files to vault
        this.encryptDotEnvFiles();
    }

    public backup(): void {
        this.vaultFileSystem.copyFile({ sourceFileName: this.vaultFileName, destinationFileName: this.vaultBackupFileName });
    }

    public removeDotEnvFiles(): void {
        const encryptionKeys = this.vaultKeysManager.readEncryptionKeys();
        const allDotEnvFiles = this.vaultFileSystem.findDotEnvFiles();
        const vaultData = this.decryptEnvironmentsVault({ encryptionKeysByEnvironment: encryptionKeys });

        for (let { path, fileName } of allDotEnvFiles) {
            const environmentName = mapDotEnvFileNameToEnvironmentName(fileName);
            if (!environmentName || !encryptionKeys[environmentName]) {
                this.logger.info(`${fileName} Not removed encryption key is missing`);
                continue;
            }

            if (!vaultData[environmentName].decrypted) {
                this.logger.info(`${fileName} Not removed because it cannot be decrypted from vault`);
                continue;
            }

            this.vaultFileSystem.rmSync(path);
        }
    }

    public decryptDotEnvFiles(): void {
        const decryptedVault = this.decryptEnvironmentsVault({ encryptionKeysByEnvironment: this.vaultKeysManager.readEncryptionKeys() });
        const files = Object.values(decryptedVault).filter(({ decrypted }) => decrypted);

        for (const { environmentName, decryptedStringContent } of files) {
            this.vaultFileSystem.writeFile({ fileName: `.env.${environmentName.toLowerCase()}`, content: decryptedStringContent });
        }
    }

    public encryptDotEnvFiles(): void {
        const encryptionKeys = this.vaultKeysManager.readEncryptionKeys();
        const envVaultContent = this.readVaultData();
        const dotEnvFilesPath = this.vaultFileSystem.findDotEnvFiles();

        for (const { path, fileName } of dotEnvFilesPath) {
            const environmentName = mapDotEnvFileNameToEnvironmentName(fileName);
            if (!environmentName) {
                continue;
            }
            const environmentEncryptionKey = encryptionKeys[environmentName];
            if (!environmentEncryptionKey) {
                continue;
            }
            envVaultContent[environmentName] = encryptData({
                data: this.vaultFileSystem.readFileContent(path),
                ...environmentEncryptionKey,
            });
        }

        this.saveVaultData({ type: 'EnvVaultJsonData', content: envVaultContent });
    }

    public rotateEncryptionKeys(): void {
        this.decryptDotEnvFiles();
        // Once we have back the dot env files we can safely recreate the vault.
        this.reCreate();
    }

    public async mergeMainVaultWithBackup(askUserToDecideOnMergeConflict: (options: MergeConflictQuestion) => Promise<string>): Promise<void> {
        const vaultDifferences = this.getDiffsWithBackup();
        const finalVault = cloneDeep(vaultDifferences.mainVault);

        for (const diff of vaultDifferences.diffs) {
            if (diff.type === 'environment-diff') {
                const result = await askUserToDecideOnMergeConflict({
                    question: `[${diff.environmentName}]: Environment exists only in file: ${diff.fileName}`,
                    options: [
                        { key: EnvironmentDiffOption.Keep, label: `Keep` },
                        { key: EnvironmentDiffOption.Discard, label: `Discard` },
                    ],
                });

                switch (result) {
                    case EnvironmentDiffOption.Keep:
                        finalVault[diff.environmentName] = diff.vaultInfo;
                        break;
                }
                continue;
            }

            if (diff.left.fileName === ENV_VAULT_BACKUP_FILE_NAME) {
                const right = diff.right;
                diff.right = diff.left;
                diff.left = right;
            }

            const result = await askUserToDecideOnMergeConflict({
                question: `[${diff.environmentName}]: Different values found for "${diff.envVarName}"`,
                options: [
                    { key: EnvVarDiffOption.Main, label: `${diff.left.value}` },
                    { key: EnvVarDiffOption.Backup, label: `${diff.right.value}` },
                    { key: EnvVarDiffOption.Discard, label: `Discard` },
                ],
            });

            switch (result) {
                case EnvVarDiffOption.Main:
                    finalVault[diff.environmentName].data ??= {};
                    finalVault[diff.environmentName].data![diff.envVarName] = diff.left.value;
                    break;
                case EnvVarDiffOption.Backup:
                    finalVault[diff.environmentName].data ??= {};
                    finalVault[diff.environmentName].data![diff.envVarName] = diff.right.value;
                    break;
            }
        }
    }

    private getDiffsWithBackup(): VaultDifferenceOverview {
        const envVaultKeys = this.vaultKeysManager.readEncryptionKeys();
        const mainVault = this.decryptEnvironmentsVault({ encryptionKeysByEnvironment: envVaultKeys });
        const backupVault = this.decryptEnvironmentsVault({ encryptionKeysByEnvironment: envVaultKeys });

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
    }
}
