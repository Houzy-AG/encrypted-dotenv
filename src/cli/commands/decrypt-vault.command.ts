import { decryptVault, writeEnvsToDisk } from '../../core/vault';
import { getVaultKeys } from '../../core/vault-keys';

export const run = (options: { dotEnvFilesDirectory?: string }): void => {
    const envVaultKeys = getVaultKeys(options);
    const decryptedVault = decryptVault({ ...options, envVaultKeys });
    writeEnvsToDisk(
        options.dotEnvFilesDirectory,
        Object.values(decryptedVault).filter(({ decrypted }) => decrypted),
    );
};
