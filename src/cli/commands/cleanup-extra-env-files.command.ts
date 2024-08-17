import * as fs from 'node:fs';
import { findAllDotEnvFiles, getEnvironmentNameFromFileName } from '../../core/file-system';
import { DefaultArguments } from '../../core/globals/default-arguments';
import { getVaultKeys } from '../../core/vault-keys';

export const run = (options: DefaultArguments): void => {
    const envVaultKeys = getVaultKeys(options);
    const allDotEnvFiles = findAllDotEnvFiles(options);

    for (let { path, fileName } of allDotEnvFiles) {
        const environmentName = getEnvironmentNameFromFileName(fileName);
        if (environmentName && envVaultKeys[environmentName]) {
            fs.rmSync(path, { force: true, recursive: true });
            options.logger.info(`Remove file ${fileName}`);
        }
    }
};
