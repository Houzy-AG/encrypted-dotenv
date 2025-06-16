import { parse } from 'dotenv';
import { cloneDeep, difference, intersection, isEqual, isNil, pick } from 'lodash';
import * as process from 'process';
import { MergeConflictQuestion } from '../../cli/interactive-command-line-ui';
import { mergeRecordsWithValues } from '../../utils';
import { decryptData, encryptData } from '../encryption/encryption';
import { EncryptedDotEnvErrorCodes, failWithEncryptedFotEnvError } from '../errors/encrypted-dot-env-error';
import { EncryptedEnvLogger } from '../logger/encrypted-env-logger';
import { ENV_VAULT_BACKUP_FILE_NAME, ENV_VAULT_FILE_NAME } from '../vault-file-system/consts';
import { mapDotEnvFileNameToEnvironmentName } from '../vault-file-system/map-dot-env-file-name-to-environment-name';
import { VaultFileSystem } from '../vault-file-system/vault-file-system';
import { VaultKeys, VaultKeysManager } from '../vault-keys-manager/vault-keys-manager';
import { convertToString } from './utils/convert-to-string';
import { deleteEnvVarFromFile } from './utils/delete-env-var-from-file';
import { replaceOrInsertEnvVarInFile } from './utils/replace-or-insert-env-var-in-file';
import { EnvironmentDiffOption, EnvVarDiffOption, VaultDiff, VaultDifferenceOverview } from './vault-diff-types';
import { DecryptedVault, EnvVaultJsonData } from './vault-types';

export type AskForConflictFunction = (options: MergeConflictQuestion) => Promise<string>;

export class VaultEnvironmentsManager {
    private readonly vaultKeysManager: VaultKeysManager;
    private readonly vaultFileSystem: VaultFileSystem;
    private readonly logger: EncryptedEnvLogger;
    private readonly vaultFileName: string;
    private readonly vaultBackupFileName: string;

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

    private readVaultData(vaultFileName?: string): EnvVaultJsonData {
        return this.vaultFileSystem.readJson<EnvVaultJsonData>(vaultFileName || this.vaultFileName) as EnvVaultJsonData;
    }

    private saveVaultData(data: { type: 'EnvVaultJsonData'; content: EnvVaultJsonData } | { type: 'DecryptedVault'; content: DecryptedVault }): void {
        let envVaultJsonData: EnvVaultJsonData = {};

        if (data.type === 'EnvVaultJsonData') {
            envVaultJsonData = data.content;
        } else if (data.type === 'DecryptedVault') {
            envVaultJsonData = Object.values(data.content).reduce((acc, { environmentName, encryptedStringContent }) => {
                acc[environmentName] = `"${convertToString(encryptedStringContent).replace(/(?<!\\)"/g, '\\"')}"`;
                return acc;
            }, {} as EnvVaultJsonData);
        }
        this.vaultFileSystem.writeFile({ fileName: this.vaultFileName, content: envVaultJsonData });
    }

    private decryptEnvironmentOrDefault(environmentName: string): Record<string, string> {
        const encryptionKeys = this.vaultKeysManager.readEncryptionKeys();
        if (!Object.keys(encryptionKeys).length && !environmentName?.length) {
            // There are no vault keys and there is no environment set so we do not need to decrypt anything.
            return {};
        }
        let environmentNameToBeDecrypted: string | null = null;

        if (Object.keys(encryptionKeys).length === 1) {
            environmentNameToBeDecrypted = Object.keys(encryptionKeys)[0];
        } else {
            environmentNameToBeDecrypted = environmentName?.length > 0 ? environmentName : null;
        }

        if (isNil(environmentNameToBeDecrypted)) {
            failWithEncryptedFotEnvError({
                message: `No environment was specified to be decrypted`,
                errorCode: EncryptedDotEnvErrorCodes.FailedToIdentifyActiveEnvironment,
            });
        }

        const environmentNameToDecrypt = environmentNameToBeDecrypted as string;
        if (!encryptionKeys?.[environmentNameToDecrypt]) {
            failWithEncryptedFotEnvError({
                message: `No decryption key found for environment: "${environmentNameToDecrypt}"`,
                errorCode: EncryptedDotEnvErrorCodes.FailedToIdentifyDecryptionKeyForActiveEnvironment,
            });
        }

        const vaultVariables = this.decryptEnvironmentsVault({ encryptionKeysByEnvironment: pick(encryptionKeys, environmentNameToDecrypt) });
        const decryptedEnvironments = Object.values(vaultVariables).filter((vaultData) => vaultData.decrypted);
        if (!decryptedEnvironments.length) {
            failWithEncryptedFotEnvError({
                message: [`Failed to decrypt ENVIRONMENT: "${environmentNameToDecrypt}".`, `Check your decryption key`].join(' '),
                errorCode: EncryptedDotEnvErrorCodes.FailedToIdentifyDecryptEnvironmentInvalidDecryptionKey,
            });
        }

        return decryptedEnvironments[0].data ?? {};
    }

    private decryptEnvironmentsVault({
        encryptionKeysByEnvironment,
        vaultFileName,
    }: {
        encryptionKeysByEnvironment: VaultKeys;
        vaultFileName?: string;
    }): DecryptedVault {
        const envVaultContent = this.readVaultData(vaultFileName || this.vaultFileName);

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

    private getDiffsWithBackup(): VaultDifferenceOverview {
        const envVaultKeys = this.vaultKeysManager.readEncryptionKeys();
        const mainVault = this.decryptEnvironmentsVault({ encryptionKeysByEnvironment: envVaultKeys });
        const backupVault = this.decryptEnvironmentsVault({ encryptionKeysByEnvironment: envVaultKeys, vaultFileName: this.vaultBackupFileName });

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
                        errorCode: EncryptedDotEnvErrorCodes.MissingDecryptionKeyForEnvironment,
                    });
                }

                if (!right.vault[environmentName].decrypted) {
                    failWithEncryptedFotEnvError({
                        message: `Missing decryption key for environment. ${environmentName} from ${ENV_VAULT_BACKUP_FILE_NAME} could not be decrypted.`,
                        errorCode: EncryptedDotEnvErrorCodes.MissingDecryptionKeyForEnvironment,
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

    // Public api

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

    public configureLocalDotEnvFile(): void {
        const unEncryptedEnvVars = this.vaultFileSystem.getEnvVarsFromSystem();

        const correctEnvVars = mergeRecordsWithValues([
            this.vaultFileSystem.getEnvVarsFromOverrides(),
            this.decryptEnvironmentOrDefault((unEncryptedEnvVars.ENVIRONMENT ?? ``).toUpperCase()),
        ]);
        this.vaultFileSystem.writeDotEnvFile({ content: correctEnvVars, fileName: `.env` });
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

        for (const { path, fileName } of allDotEnvFiles) {
            const environmentName = mapDotEnvFileNameToEnvironmentName(fileName);
            if (!environmentName || !encryptionKeys[environmentName]) {
                this.logger.info(`${fileName} Not removed encryption key is missing`);
                continue;
            }

            if (!vaultData[environmentName]?.decrypted) {
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

    public addMissingEnvironments(): void {
        this.vaultKeysManager.createKeysForMissingDotEnvFiles();
        this.encryptDotEnvFiles();
    }

    public async mergeMainVaultWithBackup(askUserToDecideOnMergeConflict: AskForConflictFunction): Promise<void> {
        const vaultDifferences = this.getDiffsWithBackup();
        const oldVault = cloneDeep(vaultDifferences.mainVault);
        const finalVault = cloneDeep(vaultDifferences.mainVault);

        const toDeleteEnvVars: Record<string, string[]> = {};
        for (const diff of vaultDifferences.diffs) {
            if (diff.type === 'environment-diff') {
                const result = await askUserToDecideOnMergeConflict({
                    question: `[${diff.environmentName}]: Environment exists only in file: ${diff.fileName}`,
                    options: [
                        { optionValue: EnvironmentDiffOption.Keep, label: `Keep` },
                        { optionValue: EnvironmentDiffOption.Discard, label: `Discard` },
                    ],
                });

                switch (result) {
                    case EnvironmentDiffOption.Keep:
                        finalVault[diff.environmentName] = diff.vaultInfo;
                        break;
                    case EnvironmentDiffOption.Discard:
                        delete finalVault[diff.environmentName];
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
                    { optionValue: EnvVarDiffOption.RemoteValue, label: `Remote Value -> ${diff.left.value}` },
                    { optionValue: EnvVarDiffOption.LocalValue, label: `Local Value -> ${diff.right.value}` },
                    { optionValue: EnvVarDiffOption.Discard, label: `Discard Both` },
                ],
            });
            finalVault[diff.environmentName].data ??= {};
            toDeleteEnvVars[diff.environmentName] ??= [];
            const vaultData = finalVault[diff.environmentName].data as Record<string, string | undefined>;

            switch (result) {
                case EnvVarDiffOption.RemoteValue:
                    vaultData[diff.envVarName] = diff.left.value;
                    break;
                case EnvVarDiffOption.LocalValue:
                    vaultData[diff.envVarName] = diff.right.value;
                    break;
                default:
                    toDeleteEnvVars[diff.environmentName].push(diff.envVarName);
                    delete vaultData[diff.envVarName];
                    break;
            }
        }

        const encryptionKeys = this.vaultKeysManager.readEncryptionKeys();
        for (const environmentName in finalVault) {
            const encryptionKey = encryptionKeys[environmentName];
            if (isNil(encryptionKey)) {
                continue;
            }

            let decryptedStringContent = finalVault[environmentName].decryptedStringContent;

            for (const toDeleteEnvVarName of toDeleteEnvVars[environmentName] ?? []) {
                decryptedStringContent = deleteEnvVarFromFile({
                    envVarName: toDeleteEnvVarName,
                    oldEnvVarValue: oldVault[environmentName]?.data?.[toDeleteEnvVarName] ?? ``,
                    dotEnvFileContent: decryptedStringContent,
                });
            }

            for (const envVarName in finalVault[environmentName].data ?? {}) {
                const newEnvVarValue = finalVault[environmentName]?.data?.[envVarName] ?? ``;
                decryptedStringContent = replaceOrInsertEnvVarInFile({
                    envVarName,
                    // The old env var value is can be in the old vault but if the env var was missing from the old vault then it's in the
                    // final vault.
                    oldEnvVarValue: oldVault[environmentName]?.data?.[envVarName] ?? newEnvVarValue,
                    newEnvVarValue,
                    dotEnvFileContent: decryptedStringContent,
                });
            }

            finalVault[environmentName].decryptedStringContent = decryptedStringContent;
            finalVault[environmentName].encryptedStringContent = encryptData({
                data: decryptedStringContent,
                ...encryptionKey,
            });
        }

        this.saveVaultData({ type: 'DecryptedVault', content: finalVault });
    }
}
