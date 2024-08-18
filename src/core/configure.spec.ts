import { configure } from './configure';
import { describe, expect, it } from '@jest/globals';
import { EncryptedDotEnvError, EncryptedDotEnvErrorCodes } from './errors/encrypted-dot-env-error';
import * as process from 'node:process';
import { defaultTestLogger } from './logger/encrypted-env-logger';
import { createDotEnvTestFile } from './test-utils/create-test-file';
import { DOT_ENV_FILES_DIRECTORY_FOR_TESTING, setupTests } from './test-utils/setup-tests';

setupTests();

describe(`configure`, () => {
    it(`should decrypt the current environment when there is one decryption key`, () => {
        createDotEnvTestFile({
            fileName: `.env.local`,
            envVars: [`TEST_VAR=some-random-var`],
        });

        configure({
            dotEnvFilesDirectory: DOT_ENV_FILES_DIRECTORY_FOR_TESTING,
            logger: defaultTestLogger,
        });

        expect(process.env.TEST_VAR).toBe(`some-random-var`);
    });

    it(`should fail to decrypt the environment if there is more than one decryption key specified`, () => {
        let error: Record<string, unknown> = {};
        try {
            configure({
                dotEnvFilesDirectory: TestFilesLocator.two_decryption_keys,
                logger: defaultTestLogger,
            });
        } catch (e) {
            error = e as Record<string, unknown>;
        }

        expect(error).toBeInstanceOf(EncryptedDotEnvError);
        expect(error?.errorCode).toBe(EncryptedDotEnvErrorCodes.FAILED_TO_IDENTIFY_CURRENT_ENVIRONMENT_MULTIPLE_VAULT_KEYS);
        expect(process.env.TEST_VAR?.length).toBeUndefined();
    });

    it(`should fail to decrypt the environment if there is one decryption key but the current environment name is wrong`, () => {
        let error: Record<string, unknown> = {};
        try {
            configure({
                dotEnvFilesDirectory: TestFilesLocator.one_decryption_key_with_wrong_env_name_specified,
                logger: defaultTestLogger,
            });
        } catch (e) {
            error = e as Record<string, unknown>;
        }

        expect(error).toBeInstanceOf(EncryptedDotEnvError);
        expect(error?.errorCode).toBe(EncryptedDotEnvErrorCodes.FAILED_TO_DECRYPT_ENVIRONMENT_MISSING_DECRYPTION);
        expect(process.env.TEST_VAR?.length).toBeUndefined();
    });

    it(`should fail to decrypt the environment if there is one decryption key but the key is wrong`, () => {
        let error: Record<string, unknown> = {};
        try {
            configure({
                dotEnvFilesDirectory: TestFilesLocator.only_invalid_decryption_key,
                logger: defaultTestLogger,
            });
        } catch (e) {
            error = e as Record<string, unknown>;
        }

        expect(error?.code).toBe(`ERR_OSSL_BAD_DECRYPT`);
        expect(process.env.TEST_VAR?.length).toBeUndefined();
    });

    it(`should decrypt the current environment if there is more than one decryption key but the current environment name is specified`, () => {
        configure({
            dotEnvFilesDirectory: TestFilesLocator.two_decryption_keys_with_env_name_specified,
            logger: defaultTestLogger,
        });

        expect(process.env.TEST_VAR?.length).toBeDefined();
    });
});
