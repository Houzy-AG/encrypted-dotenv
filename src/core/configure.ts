import { createVaultEnvironmentsManager } from './create-vault-environments-manager';
import { DefaultArguments } from './globals/default-arguments';
import { defaultLogger } from './logger/encrypted-env-logger';

// Return the env vars for the current environment by merging the process.env with the local .env file and with the vault variables for the
// current environment.
// current environment.
export const configure = (options?: DefaultArguments): void => {
    const vaultEnvironmentsManager = createVaultEnvironmentsManager({
        logger: options?.logger ?? defaultLogger,
        dotEnvFilesDirectory: options?.dotEnvFilesDirectory ?? ``,
    });

    vaultEnvironmentsManager.configureProcessEnv();
};
