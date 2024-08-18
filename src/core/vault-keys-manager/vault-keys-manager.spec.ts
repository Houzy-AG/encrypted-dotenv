import { beforeEach, describe, expect, test } from '@jest/globals';
import { isEqual, isObject, isString } from 'lodash';
import { defaultTestLogger } from '../logger/encrypted-env-logger';
import { createDotEnvTestFiles, existsTestFile, readTestFileContent } from '../test-utils/create-test-file';
import { setupTests, DOT_ENV_FILES_DIRECTORY_FOR_TESTING } from '../test-utils/setup-tests';
import { ENCRYPTION_KEYS_AS_ENV_VARS } from '../test-utils/vault-keys-for-testing';
import { VaultFileSystem } from '../vault-file-system/vault-file-system';
import { VaultKeysManager } from './vault-keys-manager';

setupTests();

let vaultKeysManager: VaultKeysManager;

beforeEach(() => {
    const vaultFileSystem = new VaultFileSystem({
        dotEnvFilesDirectory: DOT_ENV_FILES_DIRECTORY_FOR_TESTING,
        logger: defaultTestLogger,
    });

    vaultKeysManager = new VaultKeysManager({
        vaultFileSystem,
        logger: defaultTestLogger,
    });
});

describe(VaultKeysManager.name, () => {
    describe(VaultKeysManager.prototype.readEncryptionKeys.name, () => {
        test('should return an empty object if .env.keys file is missing', () => {
            const encryptionKeys = vaultKeysManager.readEncryptionKeys();

            expect(isEqual(encryptionKeys, {}));
        });

        test('should return all the valid keys in .env.keys', () => {
            createDotEnvTestFiles([
                {
                    fileName: `.env.keys`,
                    envVars: Object.values(ENCRYPTION_KEYS_AS_ENV_VARS),
                },
            ]);

            const encryptionKeys = vaultKeysManager.readEncryptionKeys();

            expect(isEqual(encryptionKeys, ENCRYPTION_KEYS_AS_ENV_VARS));
        });

        test('should ignore malformed encryption keys', () => {
            createDotEnvTestFiles([
                {
                    fileName: `.env.keys`,
                    envVars: [...Object.values(ENCRYPTION_KEYS_AS_ENV_VARS), `VAULT_KEY_MALFORMED=not-valid-key`],
                },
            ]);

            const encryptionKeys = vaultKeysManager.readEncryptionKeys();

            expect(isEqual(encryptionKeys, ENCRYPTION_KEYS_AS_ENV_VARS));
        });
    });

    describe(VaultKeysManager.prototype.createKeysForMissingDotEnvFiles.name, () => {
        test('should return a new key which can be used as an env var', () => {
            createDotEnvTestFiles([
                {
                    fileName: `.env.keys`,
                    envVars: Object.values(ENCRYPTION_KEYS_AS_ENV_VARS),
                },
                {
                    fileName: `.env.new_prod`,
                    envVars: [`PROD_VAR=1`, `PROD_VAR=2`],
                },
            ]);

            vaultKeysManager.createKeysForMissingDotEnvFiles();

            const encryptionKeys = vaultKeysManager.readEncryptionKeys();
            expect(
                isObject(encryptionKeys.NEW_PROD) &&
                    isString(encryptionKeys.NEW_PROD.encryptionIV) &&
                    isString(encryptionKeys.NEW_PROD.encryptionKey),
            ).toBe(true);
        });
    });

    describe(VaultKeysManager.prototype.reCreate.name, () => {
        test('should create an empty .env.keys file if there is no file named .env.*', () => {
            vaultKeysManager.reCreate();

            expect(existsTestFile(`.env.keys`)).toBe(true);
            expect(readTestFileContent(`.env.keys`)).toBe('');
        });

        test('should create an empty .env.keys file if there is no file named .env.*', () => {
            createDotEnvTestFiles([
                { fileName: `.env.local`, envVars: [`TEST_VAR_1=1`, `TEST_VAR_2=Lorem_ipsum`] },
                { fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] },
            ]);

            vaultKeysManager.reCreate();

            expect(existsTestFile(`.env.keys`)).toBe(true);
            const vaultKeys = vaultKeysManager.readEncryptionKeys();

            expect(vaultKeys.LOCAL).not.toBe(``);
            expect(vaultKeys.STAGING).not.toBe(``);
        });

        test('should re create .env.keys each time the method is called', () => {
            createDotEnvTestFiles([
                { fileName: `.env.local`, envVars: [`TEST_VAR_1=1`, `TEST_VAR_2=Lorem_ipsum`] },
                { fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] },
            ]);

            vaultKeysManager.reCreate();

            const vaultKeys = vaultKeysManager.readEncryptionKeys();

            vaultKeysManager.reCreate();

            const reCreatedVaultKeys = vaultKeysManager.readEncryptionKeys();
            expect(isEqual(reCreatedVaultKeys, vaultKeys)).toBe(false);
        });
    });
});
