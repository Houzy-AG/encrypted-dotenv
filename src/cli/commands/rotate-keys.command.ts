import { reEncryptCurrentVaultWithKeys, writeVaultToDisk } from '../../core/vault';
import { generateKeysForEnvFiles, getVaultKeys, writeVaultKeysToDisk } from '../../core/vault-keys';
import { mapDecryptedVaultToDecodedVault } from '../../core/vault-types';

export const run = (options: { dotEnvFilesDirectory?: string }): void => {
    const { vaultContent, envVaultKeys } = reEncryptCurrentVaultWithKeys({
        ...options,
        currentVaultKeys: getVaultKeys(options),
        newVaultKeys: generateKeysForEnvFiles(options),
    });
    writeVaultKeysToDisk(options.dotEnvFilesDirectory, envVaultKeys);
    writeVaultToDisk(options.dotEnvFilesDirectory, mapDecryptedVaultToDecodedVault(vaultContent));
};
