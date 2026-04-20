import { defaultLogger, EncryptedEnvLogger } from './logger/encrypted-env-logger';
import { VaultEnvironmentsManager } from './vault-environments-manager/vault-environments-manager';
import { VaultFileSystem } from './vault-file-system/vault-file-system';
import { VaultKeysManager } from './vault-keys-manager/vault-keys-manager';

export const createVaultEnvironmentsManager = ({
    dotEnvFilesDirectory,
    logger,
}: {
    dotEnvFilesDirectory: string;
    logger?: EncryptedEnvLogger;
}): VaultEnvironmentsManager => {
    logger ??= defaultLogger;
    const vaultFileSystem = new VaultFileSystem({
        dotEnvFilesDirectory,
        logger,
    });
    const vaultKeysManager = new VaultKeysManager({
        vaultFileSystem,
        logger,
    });

    return new VaultEnvironmentsManager({
        logger,
        vaultKeysManager,
        vaultFileSystem,
    });
};
