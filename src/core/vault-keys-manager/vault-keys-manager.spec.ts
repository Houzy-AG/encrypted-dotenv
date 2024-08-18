import { describe } from '@jest/globals';
import { defaultTestLogger } from '../logger/encrypted-env-logger';
import { setupTests, DOT_ENV_FILES_DIRECTORY_FOR_TESTING } from '../test-utils/setup-tests';
import { VaultFileSystem } from '../vault-file-system/vault-file-system';
import { VaultKeysManager } from './vault-keys-manager';

setupTests();

const vaultFileSystem = new VaultFileSystem({
    dotEnvFilesDirectory: DOT_ENV_FILES_DIRECTORY_FOR_TESTING,
    logger: defaultTestLogger,
});

describe(VaultKeysManager.name, () => {});
