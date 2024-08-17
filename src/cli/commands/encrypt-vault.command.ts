import { DefaultArguments } from '../../core/globals/default-arguments';
import { encryptEnvFilesToVault, writeVaultToDisk } from '../../core/vault';
import { getVaultKeys } from '../../core/vault-keys';

export const run = (options: DefaultArguments): void => {
    const envVaultKeys = getVaultKeys(options);
    const encryptedVault = encryptEnvFilesToVault({ ...options, envVaultKeys });
    writeVaultToDisk({ ...options, envVaultContent: encryptedVault });
};
