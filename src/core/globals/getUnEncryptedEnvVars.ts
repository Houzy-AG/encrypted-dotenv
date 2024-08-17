import * as process from 'process';
import { mergeRecordsWithValues } from '../../utils';
import { getEnvironmentVariableFromLocalDotEnvFile } from '../file-system';
import { DefaultArguments } from './default-arguments';

// Return all env variables inside `process.env` + `.env` file.
export const getUnEncryptedEnvVars = (options: DefaultArguments): Record<string, string | undefined> => {
    const localDotEnvVars = getEnvironmentVariableFromLocalDotEnvFile(options);
    return mergeRecordsWithValues([{ ...process.env }, localDotEnvVars]);
};
