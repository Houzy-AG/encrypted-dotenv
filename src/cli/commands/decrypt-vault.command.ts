import { ENV_VAULT_FILE_NAME } from '../../core/file-system';
import { DefaultArguments } from '../../core/globals/default-arguments';
import { decryptVault, writeEnvsToDisk } from '../../core/vault';
import { getVaultKeys } from '../../core/vault-keys';

export const run = (options: DefaultArguments): void => {
    const envVaultKeys = getVaultKeys(options);
    const decryptedVault = decryptVault({ ...options, vaultFileName: ENV_VAULT_FILE_NAME, envVaultKeys });
    writeEnvsToDisk({
        ...options,
        files: Object.values(decryptedVault).filter(({ decrypted }) => decrypted),
    });
};
