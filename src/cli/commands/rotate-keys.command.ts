import { DefaultArguments } from '../../core/globals/default-arguments';
import { reEncryptCurrentVaultWithKeys, writeVaultToDisk } from '../../core/vault';
import { generateKeysForEnvFiles, getVaultKeys, writeVaultKeysToDisk } from '../../core/vault-keys';
import { mapDecryptedVaultToDecodedVault } from '../../core/vault-types';

export const run = (options: DefaultArguments): void => {
    const { vaultContent, envVaultKeys } = reEncryptCurrentVaultWithKeys({
        ...options,
        currentVaultKeys: getVaultKeys(options),
        newVaultKeys: generateKeysForEnvFiles(options),
    });
    writeVaultKeysToDisk({ ...options, vaultKeys: envVaultKeys });
    writeVaultToDisk({ ...options, envVaultContent: mapDecryptedVaultToDecodedVault(vaultContent) });
};
