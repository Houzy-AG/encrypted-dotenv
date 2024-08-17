import * as process from 'process';
import { mergeRecordsWithValues } from '../utils';
import { getUnEncryptedEnvVars } from './file-system';
import { DefaultArguments } from './globals/default-arguments';
import { defaultLogger } from './logger/encrypted-env-logger';
import { decryptCurrentActiveEnvironment } from './vault';

// Return the env vars for the current environment by merging the process.env with the local .env file and with the vault variables for the
// current environment.
// current environment.
export const configure = (options?: DefaultArguments): void => {
    options ??= { dotEnvFilesDirectory: ``, logger: defaultLogger };
    options.dotEnvFilesDirectory ||= ``;
    const unEncryptedEnvVars = getUnEncryptedEnvVars(options);

    const correctEnvVars = mergeRecordsWithValues([
        unEncryptedEnvVars,
        decryptCurrentActiveEnvironment({ ...options, currentEnvironment: (unEncryptedEnvVars.ENVIRONMENT ?? ``).toUpperCase() }),
    ]);
    for (const key in correctEnvVars) {
        process.env[key] = correctEnvVars[key];
    }
};
