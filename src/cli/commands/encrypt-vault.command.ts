import { encryptEnvFilesToVault, writeVaultToDisk } from '../../core/vault';
import { getVaultKeys } from '../../core/vault-keys';

export const run = (options: { dotEnvFilesDirectory?: string }): void => {
    const envVaultKeys = getVaultKeys(options);
    const encryptedVault = encryptEnvFilesToVault({ ...options, envVaultKeys });
    writeVaultToDisk(options.dotEnvFilesDirectory, encryptedVault);
};
