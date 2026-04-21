import { beforeEach, describe, expect, test } from '@jest/globals';
import { isEqual, isNil, isObject, isString, remove } from 'lodash';
import * as os from 'node:os';
import * as process from 'node:process';
import { createVaultEnvironmentsManager } from '../create-vault-environments-manager';
import { defaultTestLogger } from '../logger/encrypted-env-logger';
import {
    createDotEnvTestFiles,
    createTestFile,
    existsTestFile,
    readTestFileContent,
    readTestFileContentAsEnvVars,
    readTestFileContentAsJson,
    removeTestFile,
} from '../test-utils/create-test-file';
import { DOT_ENV_FILES_DIRECTORY_FOR_TESTING, setupTests } from '../test-utils/setup-tests';
import { ENV_VAULT_FILE_NAME } from '../vault-file-system/consts';
import { EnvironmentDiffOption, EnvVarDiffOption } from './vault-diff-types';

import { AskForConflictFunction, VaultEnvironmentsManager } from './vault-environments-manager';

setupTests();

let vaultEnvironmentsManager: VaultEnvironmentsManager;

beforeEach(() => {
    vaultEnvironmentsManager = createVaultEnvironmentsManager({
        logger: defaultTestLogger,
        dotEnvFilesDirectory: DOT_ENV_FILES_DIRECTORY_FOR_TESTING,
    });
});

describe(VaultEnvironmentsManager.name, () => {
    describe(VaultEnvironmentsManager.prototype.reCreate.name, () => {
        test('should create empty vault and empty keys if there is no .env.* files', () => {
            vaultEnvironmentsManager.reCreate();

            expect(existsTestFile(`.env.keys`)).toBe(true);
            expect(existsTestFile(`.env-vault.json`)).toBe(true);
            expect(readTestFileContent(`.env.keys`)).toBe(``);
            expect(readTestFileContent(`.env-vault.json`)).toBe(`{}`);
        });

        test('should create a new vault and encrypt all .env.* files', () => {
            createDotEnvTestFiles([
                { fileName: `.env.local`, envVars: [`TEST_VAR_1=1`, `TEST_VAR_2=Lorem_ipsum`] },
                { fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] },
            ]);

            vaultEnvironmentsManager.reCreate();

            expect(readTestFileContent(`.env.keys`)).not.toBe(``);
            expect(isObject(readTestFileContentAsJson(`.env-vault.json`))).toBe(true);
        });

        test('should recreate the .env.keys and .env-vault.json each time the function is called', () => {
            createDotEnvTestFiles([
                { fileName: `.env.local`, envVars: [`TEST_VAR_1=1`, `TEST_VAR_2=Lorem_ipsum`] },
                { fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] },
            ]);

            vaultEnvironmentsManager.reCreate();
            const keysFileContent = readTestFileContent(`.env.keys`);
            const vaultFileContent = readTestFileContentAsJson(`.env-vault.json`);

            vaultEnvironmentsManager.reCreate();
            expect(isEqual(keysFileContent, readTestFileContent(`.env.keys`))).toBe(false);
            expect(isEqual(vaultFileContent, readTestFileContentAsJson(`.env-vault.json`))).toBe(false);
        });
    });

    describe('SetupVault', () => {
        beforeEach(() => {
            createDotEnvTestFiles([
                { fileName: `.env.local`, envVars: [`TEST_VAR_1=1`, `TEST_VAR_2=Lorem_ipsum`] },
                { fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] },
            ]);

            vaultEnvironmentsManager.reCreate();
        });

        describe(VaultEnvironmentsManager.prototype.backup.name, () => {
            test('should duplicate .env-vault.json file in file .env-vault-backup.json', () => {
                vaultEnvironmentsManager.backup();

                expect(isEqual(readTestFileContentAsJson(`.env-vault.json`), readTestFileContentAsJson(`.env-vault-backup.json`))).toBe(true);
            });
        });

        describe(VaultEnvironmentsManager.prototype.removeDotEnvFiles.name, () => {
            test('should remove all .env.* files except .env.keys', () => {
                expect(existsTestFile(`.env.local`)).toBe(true);

                vaultEnvironmentsManager.removeDotEnvFiles();

                expect(existsTestFile(`.env.local`)).toBe(false);
                expect(existsTestFile(`.env.staging`)).toBe(false);
                expect(existsTestFile(`.env.keys`)).toBe(true);
            });
        });

        describe(VaultEnvironmentsManager.prototype.encryptDotEnvFiles.name, () => {
            test('should have the same output if .env.* files did not change', () => {
                const envVaultContent = readTestFileContentAsJson(`.env-vault.json`);
                vaultEnvironmentsManager.encryptDotEnvFiles();

                expect(isEqual(envVaultContent, readTestFileContentAsJson(`.env-vault.json`))).toBe(true);
            });

            test('vault content should change if any .env.* file changed', () => {
                const envVaultContent = readTestFileContentAsJson(`.env-vault.json`);

                createDotEnvTestFiles([{ fileName: `.env.local`, envVars: [`TEST_VAR_2=432423`, `TEST_VAR_2="Lorem_#ipsum"`, `SOME_VAR_3=22`] }]);

                vaultEnvironmentsManager.encryptDotEnvFiles();
                expect(isEqual(envVaultContent, readTestFileContentAsJson(`.env-vault.json`))).toBe(false);
            });
        });

        describe(VaultEnvironmentsManager.prototype.decryptDotEnvFiles.name, () => {
            test('it should be able to decrypt .env.* files', () => {
                const localEnvVars = readTestFileContentAsEnvVars(`.env.local`);
                const stagingEnvVars = readTestFileContentAsEnvVars(`.env.staging`);
                vaultEnvironmentsManager.removeDotEnvFiles();

                vaultEnvironmentsManager.decryptDotEnvFiles();

                expect(isEqual(localEnvVars, readTestFileContentAsEnvVars(`.env.local`))).toBe(true);
                expect(isEqual(stagingEnvVars, readTestFileContentAsEnvVars(`.env.staging`))).toBe(true);
            });
        });

        describe(VaultEnvironmentsManager.prototype.addMissingEnvironments.name, () => {
            test('should add to .env-vault.json if there are new .env.* files', () => {
                createDotEnvTestFiles([{ fileName: `.env.prod_v2`, envVars: [`PROD_V2_VAR_1=Lorem_Ipsum`, `PROD_V2_VAR_2=Lorem_Ipsum_CATAPULT`] }]);

                vaultEnvironmentsManager.addMissingEnvironments();

                const vaultContent = readTestFileContentAsJson(`.env-vault.json`) as Record<string, string>;
                expect(isString(vaultContent?.LOCAL)).toBe(true);
                expect(isString(vaultContent?.STAGING)).toBe(true);
                expect(isString(vaultContent?.PROD_V2)).toBe(true);
            });

            test('should not not touch existing encrypted environments if the keys for decripting them are missing', () => {
                createDotEnvTestFiles([{ fileName: `.env.prod_v2`, envVars: [`PROD_V2_VAR_1=Lorem_Ipsum`, `PROD_V2_VAR_2=Lorem_Ipsum_CATAPULT`] }]);

                removeTestFile(`.env.keys`);

                vaultEnvironmentsManager.addMissingEnvironments();

                const vaultContent = readTestFileContentAsJson(`.env-vault.json`) as Record<string, string>;
                expect(isString(vaultContent?.LOCAL)).toBe(true);
                expect(isString(vaultContent?.STAGING)).toBe(true);
                expect(isString(vaultContent?.PROD_V2)).toBe(true);
            });
        });

        describe(VaultEnvironmentsManager.prototype.rotateEncryptionKeys.name, () => {
            test('should change the encryption keys but vault should contain the same env vars', () => {
                vaultEnvironmentsManager.decryptDotEnvFiles();

                const currentEncryptionKeys = readTestFileContentAsEnvVars(`.env.keys`);
                const localEnvVars = readTestFileContentAsEnvVars(`.env.local`);
                const stagingEnvVars = readTestFileContentAsEnvVars(`.env.staging`);
                removeTestFile(`.env.local`);
                removeTestFile(`.env.staging`);

                vaultEnvironmentsManager.rotateEncryptionKeys();

                expect(isEqual(currentEncryptionKeys, readTestFileContentAsEnvVars(`.env.keys`))).toBe(false);

                vaultEnvironmentsManager.decryptDotEnvFiles();
                expect(isEqual(localEnvVars, readTestFileContentAsEnvVars(`.env.local`))).toBe(true);
                expect(isEqual(stagingEnvVars, readTestFileContentAsEnvVars(`.env.staging`))).toBe(true);
            });
        });
    });

    describe(VaultEnvironmentsManager.prototype.configureProcessEnv.name, () => {
        test('should not fail if there is no vault initialized', () => {
            let err = null;
            try {
                vaultEnvironmentsManager.configureProcessEnv();
            } catch (e) {
                err = e;
            }

            expect(err).toBeNull();
        });

        test(`should put .env file vars in process.env`, () => {
            createDotEnvTestFiles([{ fileName: '.env', envVars: [`VAR_TEST="#1"`] }]);

            vaultEnvironmentsManager.configureProcessEnv();

            expect(process.env.VAR_TEST).toBe(`#1`);
        });

        test('should put env vars from vault if there is just one environment inside vault', () => {
            createDotEnvTestFiles([{ fileName: '.env.local', envVars: [`VAR_TEST_LOCAL=1`] }]);
            vaultEnvironmentsManager.reCreate();

            removeTestFile(`.env.local`);

            vaultEnvironmentsManager.configureProcessEnv();
            expect(process.env.VAR_TEST_LOCAL).toBe(`1`);
        });

        test('should fail if there are more then one environment inside the vault and we did not specify which environment to use', () => {
            createDotEnvTestFiles([
                { fileName: `.env.local`, envVars: [`TEST_VAR_1=1`, `TEST_VAR_2=Lorem_ipsum`] },
                { fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] },
            ]);
            vaultEnvironmentsManager.reCreate();

            let error: unknown = null;
            try {
                vaultEnvironmentsManager.configureProcessEnv();
            } catch (e) {
                error = { e };
            }

            expect(error).not.toBeNull();
        });

        test('should fail if there are multiple environments and active environment decryption key is missing', () => {
            createDotEnvTestFiles([
                { fileName: `.env.local`, envVars: [`TEST_VAR_1=1`, `TEST_VAR_2=Lorem_ipsum`] },
                { fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] },
            ]);
            vaultEnvironmentsManager.reCreate();
            createDotEnvTestFiles([{ fileName: '.env', envVars: [`ENVIRONMENT=testing`] }]);

            let error: unknown = null;
            try {
                vaultEnvironmentsManager.configureProcessEnv();
            } catch (e) {
                error = { e };
            }

            expect(error).not.toBeNull();
        });

        test('should not fail if there is one decryption key', () => {
            createDotEnvTestFiles([
                { fileName: `.env.local`, envVars: [`TEST_VAR_1=1`, `TEST_VAR_2=Lorem_ipsum`] },
                { fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] },
            ]);
            vaultEnvironmentsManager.reCreate();

            const vaultKeys = readTestFileContentAsEnvVars(`.env.keys`);
            removeTestFile(`.env.keys`);
            delete vaultKeys.VAULT_KEY_LOCAL;
            createDotEnvTestFiles([
                {
                    fileName: `.env.keys`,
                    envVars: Object.entries(vaultKeys).map(([key, value]) => `${key}=${value}`),
                },
            ]);

            vaultEnvironmentsManager.configureProcessEnv();

            expect(isNil(process.env.TEST_VAR_1)).toBe(true);
            expect(isNil(process.env.TEST_VAR_2)).toBe(true);
            expect(process.env.TEST_VAR_3).toBe(`3`);
            expect(process.env.TEST_VAR_4).toBe(`THIS_IS_THE_GOAT`);
        });

        test('should add to process env just the env vars from the specified environment even if we have multiple encryption keys', () => {
            createDotEnvTestFiles([
                { fileName: `.env.local`, envVars: [`TEST_VAR_1=1`, `TEST_VAR_2=Lorem_ipsum`] },
                { fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] },
            ]);
            createDotEnvTestFiles([{ fileName: `.env`, envVars: [`ENVIRONMENT=staging`, `TEST_VAR_NUMBER_LOCAL_ENV=Lorem_ipsum`] }]);
            vaultEnvironmentsManager.reCreate();

            vaultEnvironmentsManager.configureProcessEnv();
            expect(isNil(process.env.TEST_VAR_1)).toBe(true);
            expect(isNil(process.env.TEST_VAR_2)).toBe(true);
            expect(process.env.TEST_VAR_3).toBe(`3`);
            expect(process.env.TEST_VAR_4).toBe(`THIS_IS_THE_GOAT`);
            expect(process.env.TEST_VAR_NUMBER_LOCAL_ENV).toBe(`Lorem_ipsum`);
        });
    });

    describe(VaultEnvironmentsManager.prototype.mergeMainVaultWithBackup.name, () => {
        test('it should ask for changes when env vault has conflicts', async () => {
            // ==== Arrange ====
            // Create a vault
            createDotEnvTestFiles([
                { fileName: `.env.local`, envVars: [`TEST_VAR_1=1`, `TEST_VAR_2=Lorem_ipsum`] },
                { fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] },
            ]);
            vaultEnvironmentsManager.reCreate();
            // Set up the backup file
            vaultEnvironmentsManager.backup();
            // Create simulate a merge conflict where `.env-vault.json` chose to take remote values.
            createDotEnvTestFiles([{ fileName: `.env.local`, envVars: [`TEST_VAR_1=Remote_branch_VAR_1`, `TEST_VAR_2=Lorem_ipsum_2_VAR_2`] }]);
            vaultEnvironmentsManager.encryptDotEnvFiles();

            // Mock askForConflict function
            const askForConflictFunction: AskForConflictFunction = async ({ question, options }) => {
                if (question === `[LOCAL]: Different values found for "TEST_VAR_1"`) {
                    return options.find((item) => item.optionValue === EnvVarDiffOption.RemoteValue)?.optionValue ?? EnvVarDiffOption.Discard;
                }
                if (question === `[LOCAL]: Different values found for "TEST_VAR_2"`) {
                    return options.find((item) => item.optionValue === EnvVarDiffOption.LocalValue)?.optionValue ?? EnvVarDiffOption.Discard;
                }

                return EnvVarDiffOption.Discard;
            };

            // ==== Act ====
            // Start the merge process
            await vaultEnvironmentsManager.mergeMainVaultWithBackup(askForConflictFunction);

            // ==== Assert ====
            // verify merge was done correctly
            vaultEnvironmentsManager.removeDotEnvFiles();
            vaultEnvironmentsManager.decryptDotEnvFiles();

            const envVars = readTestFileContentAsEnvVars(`.env.local`);
            expect(envVars.TEST_VAR_1).toBe(`Remote_branch_VAR_1`);
            expect(envVars.TEST_VAR_2).toBe(`Lorem_ipsum`);
        });

        test(`it should preserve comments if they are present in dot env file`, async () => {
            // ==== Arrange ====
            // Create a vault
            createDotEnvTestFiles([
                { fileName: `.env.local`, envVars: [`TEST_VAR_1=1`, `TEST_VAR_2=Lorem_ipsum`] },
                { fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] },
            ]);
            vaultEnvironmentsManager.reCreate();
            // Set up the backup file
            vaultEnvironmentsManager.backup();
            vaultEnvironmentsManager.removeDotEnvFiles();
            // Create simulate a merge conflict where `.env-vault.json` chose to take remote values.
            createTestFile({
                fileName: `.env.local`,
                fileContent: [
                    `# Comment Test one`,
                    `TEST_VAR_1=Remote_branch_VAR_1`,
                    `# Second comment for second var`,
                    `TEST_VAR_2=Lorem_ipsum_2_VAR_2`,
                ].join(os.EOL),
            });
            vaultEnvironmentsManager.encryptDotEnvFiles();

            // Mock askForConflict function
            const askForConflictFunction: AskForConflictFunction = async ({ question, options }) => {
                if (question === `[LOCAL]: Different values found for "TEST_VAR_1"`) {
                    return options.find((item) => item.optionValue === EnvVarDiffOption.RemoteValue)?.optionValue ?? EnvVarDiffOption.Discard;
                }
                if (question === `[LOCAL]: Different values found for "TEST_VAR_2"`) {
                    return options.find((item) => item.optionValue === EnvVarDiffOption.LocalValue)?.optionValue ?? EnvVarDiffOption.Discard;
                }

                return EnvVarDiffOption.Discard;
            };

            // ==== Act ====
            // Start the merge process
            await vaultEnvironmentsManager.mergeMainVaultWithBackup(askForConflictFunction);

            // ==== Assert ====
            // verify merge was done correctly
            vaultEnvironmentsManager.removeDotEnvFiles();
            vaultEnvironmentsManager.decryptDotEnvFiles();

            const envVars = readTestFileContentAsEnvVars(`.env.local`);
            expect(envVars.TEST_VAR_1).toBe(`Remote_branch_VAR_1`);
            expect(envVars.TEST_VAR_2).toBe(`Lorem_ipsum`);
            const envLocal = readTestFileContent(`.env.local`);

            expect(envLocal.includes(`# Comment Test one`)).toBe(true);
            expect(envLocal.includes(`# Second comment for second var`)).toBe(true);
        });

        test(`it should keep discard env vars exactly how user specifies it`, async () => {
            // ==== Arrange ====
            // Create a vault
            createDotEnvTestFiles([
                { fileName: `.env.local`, envVars: [`TEST_VAR_1=1`, `TEST_VAR_2=Lorem_ipsum`] },
                { fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] },
            ]);
            vaultEnvironmentsManager.reCreate();
            // Set up the backup file
            vaultEnvironmentsManager.backup();
            vaultEnvironmentsManager.removeDotEnvFiles();
            // Create simulate a merge conflict where `.env-vault.json` chose to take remote values.
            createTestFile({
                fileName: `.env.local`,
                fileContent: [
                    `# Comment Test one`,
                    `TEST_VAR_6="Remote_branch_VAR_1"`,
                    `# Second comment for second var`,
                    `TEST_VAR_7="Lorem_ipsum_2_VAR_2"`,
                ].join(os.EOL),
            });
            vaultEnvironmentsManager.encryptDotEnvFiles();

            // Mock askForConflict function
            const askForConflictFunction: AskForConflictFunction = async ({ question, options }) => {
                if (question === `[LOCAL]: Different values found for "TEST_VAR_1"`) {
                    return options.find((item) => item.optionValue === EnvVarDiffOption.LocalValue)?.optionValue ?? EnvVarDiffOption.Discard;
                }
                if (question === `[LOCAL]: Different values found for "TEST_VAR_6"`) {
                    return options.find((item) => item.optionValue === EnvVarDiffOption.RemoteValue)?.optionValue ?? EnvVarDiffOption.Discard;
                }

                return EnvVarDiffOption.Discard;
            };
            // ==== Act ====
            // Start the merge process
            await vaultEnvironmentsManager.mergeMainVaultWithBackup(askForConflictFunction);

            // ==== Assert ====
            // verify merge was done correctly
            vaultEnvironmentsManager.removeDotEnvFiles();
            vaultEnvironmentsManager.decryptDotEnvFiles();

            const envVars = readTestFileContentAsEnvVars(`.env.local`);
            expect(envVars.TEST_VAR_1).toBe(`1`);
            expect(envVars.TEST_VAR_3).not.toBeDefined();
            expect(envVars.TEST_VAR_6).toBe(`Remote_branch_VAR_1`);
            expect(envVars.TEST_VAR_7).not.toBeDefined();
            const envLocal = readTestFileContent(`.env.local`);

            expect(envLocal.includes(`# Comment Test one`)).toBe(true);
            expect(envLocal.includes(`# Second comment for second var`)).toBe(true);
        });

        test(`it should discard staging environment and keep local if user decides this`, async () => {
            // ==== Arrange ====
            // Create a vault
            createDotEnvTestFiles([{ fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] }]);
            vaultEnvironmentsManager.reCreate();
            // Set up the backup file
            vaultEnvironmentsManager.backup();
            vaultEnvironmentsManager.removeDotEnvFiles();
            // Create simulate a merge conflict where `.env-vault.json` chose to take remote values.
            createTestFile({
                fileName: `.env.local`,
                fileContent: [
                    `# Comment Test one`,
                    `TEST_VAR_6=Remote_branch_VAR_1`,
                    `# Second comment for second var`,
                    `TEST_VAR_7=Lorem_ipsum_2_VAR_2`,
                ].join(os.EOL),
            });
            removeTestFile(ENV_VAULT_FILE_NAME);
            vaultEnvironmentsManager.encryptDotEnvFiles();
            vaultEnvironmentsManager.addMissingEnvironments();

            // Mock askForConflict function
            const askForConflictFunction: AskForConflictFunction = async ({ question }) => {
                if (question === `[STAGING]: Environment exists only in file: .env-vault-backup.json`) {
                    return EnvironmentDiffOption.Discard;
                }
                if (question === `[LOCAL]: Environment exists only in file: .env-vault.json`) {
                    return EnvironmentDiffOption.Keep;
                }
                return EnvironmentDiffOption.Discard;
            };
            // ==== Act ====
            // Start the merge process
            await vaultEnvironmentsManager.mergeMainVaultWithBackup(askForConflictFunction);

            // ==== Assert ====
            // verify merge was done correctly
            removeTestFile(`.env.staging`);
            removeTestFile(`.env.local`);
            vaultEnvironmentsManager.decryptDotEnvFiles();

            expect(existsTestFile(`.env.staging`)).toBe(false);
            expect(existsTestFile(`.env.local`)).toBe(true);
            const envVars = readTestFileContentAsEnvVars(`.env.local`);
            expect(envVars.TEST_VAR_4).not.toBeDefined();
            expect(envVars.TEST_VAR_3).not.toBeDefined();
            expect(envVars.TEST_VAR_6).toBe(`Remote_branch_VAR_1`);
            expect(envVars.TEST_VAR_7).toBe(`Lorem_ipsum_2_VAR_2`);
            const envLocal = readTestFileContent(`.env.local`);

            expect(envLocal.includes(`# Comment Test one`)).toBe(true);
            expect(envLocal.includes(`# Second comment for second var`)).toBe(true);
        });

        test(`it should discard local environment and keep staging if user decides this`, async () => {
            // ==== Arrange ====
            // Create a vault
            createDotEnvTestFiles([{ fileName: `.env.staging`, envVars: [`TEST_VAR_3=3`, `TEST_VAR_4=THIS_IS_THE_GOAT`] }]);
            vaultEnvironmentsManager.reCreate();
            // Set up the backup file
            vaultEnvironmentsManager.backup();
            vaultEnvironmentsManager.removeDotEnvFiles();
            // Create simulate a merge conflict where `.env-vault.json` chose to take remote values.
            createTestFile({
                fileName: `.env.local`,
                fileContent: [
                    `# Comment Test one`,
                    `TEST_VAR_6=Remote_branch_VAR_1`,
                    `# Second comment for second var`,
                    `TEST_VAR_7=Lorem_ipsum_2_VAR_2`,
                ].join(os.EOL),
            });
            removeTestFile(ENV_VAULT_FILE_NAME);
            vaultEnvironmentsManager.encryptDotEnvFiles();
            vaultEnvironmentsManager.addMissingEnvironments();

            // Mock askForConflict function
            const askForConflictFunction: AskForConflictFunction = async ({ question }) => {
                if (question === `[STAGING]: Environment exists only in file: .env-vault-backup.json`) {
                    return EnvironmentDiffOption.Keep;
                }
                if (question === `[LOCAL]: Environment exists only in file: .env-vault.json`) {
                    return EnvironmentDiffOption.Discard;
                }
                return EnvironmentDiffOption.Discard;
            };
            // ==== Act ====
            // Start the merge process
            await vaultEnvironmentsManager.mergeMainVaultWithBackup(askForConflictFunction);

            // ==== Assert ====
            // verify merge was done correctly
            removeTestFile(`.env.staging`);
            removeTestFile(`.env.local`);
            vaultEnvironmentsManager.decryptDotEnvFiles();

            expect(existsTestFile(`.env.staging`)).toBe(true);
            expect(existsTestFile(`.env.local`)).toBe(false);
            const envVars = readTestFileContentAsEnvVars(`.env.staging`);
            expect(envVars.TEST_VAR_4).toBe(`THIS_IS_THE_GOAT`);
            expect(envVars.TEST_VAR_3).toBe(`3`);
            expect(envVars.TEST_VAR_6).not.toBeDefined();
            expect(envVars.TEST_VAR_7).not.toBeDefined();
        });
    });
});
