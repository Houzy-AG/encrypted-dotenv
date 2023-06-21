import { encryptEnvFilesToVault, writeVaultToDisk } from '../../core/vault';
import { generateKeysForEnvFiles, writeVaultKeysToDisk } from '../../core/vault-keys';

export const run = (options: { dotEnvFilesDirectory?: string }): void => {
    const envVaultKeys = generateKeysForEnvFiles(options);
    const encryptedVault = encryptEnvFilesToVault({ ...options, envVaultKeys });
    writeVaultKeysToDisk(options.dotEnvFilesDirectory, envVaultKeys);
    writeVaultToDisk(options.dotEnvFilesDirectory, encryptedVault);
};
