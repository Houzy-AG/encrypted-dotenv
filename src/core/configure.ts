import { isNil } from 'lodash';
import * as process from 'process';
import { getEnvironmentVariableFromLocalDotEnvFile } from './file-system';
import { mergeRecords } from '../utils';
import { decryptVault } from './vault';
import { getVaultKeys } from './vault-keys';
import { DecodedVault } from './vault-types';

const getEnvironmentVariablesForCurrentEnvironmentFromVault = (options: {
    dotEnvFilesDirectory?: string;
    expectedEnvironment: string;
}): DecodedVault => {
    const vaultVariables = decryptVault({ ...options, envVaultKeys: getVaultKeys(options) });
    const decryptedVaults = Object.values(vaultVariables).filter((vaultData) => vaultData.decrypted);
    if (!decryptedVaults.length) {
        console.info(`No environment could be decoded from vault`);
        return {};
    }

    if (decryptedVaults.length > 1) {
        if (!options.expectedEnvironment?.length) {
            throw new Error(`Missing process.env.environment and more then one environment was decrypted`);
        }

        const envVarsInVault = decryptedVaults.find((vaultData) => vaultData.environmentName === options.expectedEnvironment);
        if (isNil(envVarsInVault)) {
            throw new Error(`Missing env vars for environment: ${options.expectedEnvironment} in vault`);
        }
        return envVarsInVault.data;
    }

    return decryptedVaults[0].data;
};

// Return the env vars for the current environment by merging the process.env with the local .env file and with the vault variables for the
// current environment.
// current environment.
export const configure = (options?: { dotEnvFilesDirectory?: string }): void => {
    options ??= {};
    options.dotEnvFilesDirectory ||= ``;
    const localDotEnvVars = getEnvironmentVariableFromLocalDotEnvFile(options?.dotEnvFilesDirectory);
    const expectedEnvironment = (process.env.ENVIRONMENT ?? localDotEnvVars.ENVIRONMENT ?? ``).toUpperCase();

    const correctEnvVars = mergeRecords([
        { ...process.env },
        localDotEnvVars,
        getEnvironmentVariablesForCurrentEnvironmentFromVault({ ...options, expectedEnvironment }),
    ]);
    for (const key in correctEnvVars) {
        process.env[key] = correctEnvVars[key];
    }
};
