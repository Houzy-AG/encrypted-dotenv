import { ENV_VAULT_FILE_NAME } from '../../core/file-system';
import { DefaultArguments } from '../../core/globals/default-arguments';
import { encryptEnvFilesToVault, writeVaultToDisk } from '../../core/vault';
import { getVaultKeys } from '../../core/vault-keys';

export const run = (options: DefaultArguments): void => {
    const envVaultKeys = getVaultKeys(options);
    const encryptedVault = encryptEnvFilesToVault({ ...options, vaultFileName: ENV_VAULT_FILE_NAME, envVaultKeys });
    writeVaultToDisk({ ...options, vaultFileName: ENV_VAULT_FILE_NAME, envVaultContent: encryptedVault });
};
