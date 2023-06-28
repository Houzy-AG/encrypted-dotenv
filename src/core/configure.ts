import * as process from 'process';
import { getEnvironmentVariableFromLocalDotEnvFile } from './file-system';
import { isNil, mergeRecordsWithValues } from '../utils';
import { decryptVault } from './vault';
import { getVaultKeys } from './vault-keys';
import { EnvVaultJsonData } from './vault-types';

const getEnvironmentVariablesForCurrentEnvironmentFromVault = (options: {
    dotEnvFilesDirectory?: string;
    currentEnvironment: string;
}): EnvVaultJsonData => {
    const vaultVariables = decryptVault({ ...options, envVaultKeys: getVaultKeys(options) });
    const decryptedEnvironments = Object.values(vaultVariables).filter((vaultData) => vaultData.decrypted);
    if (!decryptedEnvironments.length) {
        console.info(`No environment could be decoded from vault`);
        return {};
    }

    if (decryptedEnvironments.length > 1) {
        // Since the vault can have multiple environments, and we can also have the decryption keys for more than one environment we have to
        // specify in this case which environment to use from the vault.
        if (!options.currentEnvironment?.length) {
            throw new Error(
                [
                    `Missing ENVIRONMENT and more then one environment was decrypted.`,
                    `If you have multiple decryption keys specified in the current machine please specify which environment from the vault to use ENVIRONMENT={{environmentToUseFromVault}}`,
                ].join(' '),
            );
        }

        // We try to locate the currentEnvironment in the vault and if the current environment is missing we throw an error because the machine
        // is probably missconfigured.
        const envVarsInVault = decryptedEnvironments.find((vaultData) => vaultData.environmentName === options.currentEnvironment);
        if (isNil(envVarsInVault)) {
            throw new Error(
                [
                    `Vault could not decrypt the ENVIRONMENT=${options.currentEnvironment}.`,
                    `Please provide decryption key for the vault for ENVIRONMENT=${options.currentEnvironment}`,
                ].join(' '),
            );
        }
        return envVarsInVault.data ?? {};
    }

    return decryptedEnvironments[0].data ?? {};
};

// Return the env vars for the current environment by merging the process.env with the local .env file and with the vault variables for the
// current environment.
// current environment.
export const configure = (options?: { dotEnvFilesDirectory?: string }): void => {
    options ??= {};
    options.dotEnvFilesDirectory ||= ``;
    const localDotEnvVars = getEnvironmentVariableFromLocalDotEnvFile(options?.dotEnvFilesDirectory);
    const expectedEnvironment = (process.env.ENVIRONMENT ?? localDotEnvVars.ENVIRONMENT ?? ``).toUpperCase();

    const correctEnvVars = mergeRecordsWithValues([
        { ...process.env },
        localDotEnvVars,
        getEnvironmentVariablesForCurrentEnvironmentFromVault({ ...options, currentEnvironment: expectedEnvironment }),
    ]);
    for (const key in correctEnvVars) {
        process.env[key] = correctEnvVars[key];
    }
};
