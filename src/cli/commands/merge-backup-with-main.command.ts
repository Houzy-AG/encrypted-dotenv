import { cloneDeep } from 'lodash';
import { ENV_VAULT_BACKUP_FILE_NAME, ENV_VAULT_FILE_NAME } from '../../core/file-system';
import { DefaultArguments } from '../../core/globals/default-arguments';
import { getDifferencesBetweenVaults, writeVaultToDisk } from '../../core/vault';
import { getVaultKeys } from '../../core/vault-keys';
import { mapDecryptedVaultToDecodedVault } from '../../core/vault-types';
import { MergeConflictQuestion } from '../interactive-command-line-ui';

export enum EnvVarDiffOption {
    Main = `Main`, // Keep value from `.env-vault.json`
    Backup = `Backup`, // Keep value from `.env-vault-backup.json`
    Discard = `Discard`, // Discard both values.
}

export enum EnvironmentDiffOption {
    Discard = `Discard`,
    Keep = `Keep`,
}

export const run = async ({
    askUserToDecideOnMergeConflict,
    ...options
}: DefaultArguments & {
    askUserToDecideOnMergeConflict: (options: MergeConflictQuestion) => Promise<string>;
}): Promise<void> => {
    const envVaultKeys = getVaultKeys(options);
    const vaultDifferences = getDifferencesBetweenVaults({
        ...options,
        envVaultKeys,
    });

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

    writeVaultToDisk({ ...options, vaultFileName: ENV_VAULT_FILE_NAME, envVaultContent: mapDecryptedVaultToDecodedVault(finalVault) });
};
