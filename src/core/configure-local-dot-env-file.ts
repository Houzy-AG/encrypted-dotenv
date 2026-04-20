import { createVaultEnvironmentsManager } from './create-vault-environments-manager';
import { defaultLogger, EncryptedEnvLogger } from './logger/encrypted-env-logger';

// Return the env vars for the current environment by merging the process.env with the local .env file and with the vault variables for the
// current environment.
// current environment.
export const configureLocalDotEnvFile = (options?: { dotEnvFilesDirectory?: string; logger?: EncryptedEnvLogger }): void => {
    const vaultEnvironmentsManager = createVaultEnvironmentsManager({
        logger: options?.logger ?? defaultLogger,
        dotEnvFilesDirectory: options?.dotEnvFilesDirectory ?? ``,
    });

    vaultEnvironmentsManager.configureLocalDotEnvFile();
};
