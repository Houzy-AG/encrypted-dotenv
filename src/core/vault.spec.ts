import { beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'node:os';
import { TestFilesLocator } from '../test-files/test-files-locator';
import { DefaultArguments } from './globals/default-arguments';
import { defaultTestLogger } from './logger/encrypted-env-logger';
import { expectFileToExistWithContent, setupProcessEnvForTest } from './test-utils/setupProcessEnvForTest';
import { decryptVault, encryptEnvFilesToVault, readVaultFromDisk, writeEnvsToDisk, writeVaultToDisk } from './vault';
import { decodeVaultKey } from './vault-keys';
import { EnvVaultJsonData } from './vault-types';

setupProcessEnvForTest();

describe('readVaultFromDisk', () => {
    it('should return an empty object if .env-vault.json does not exist', () => {
        const result = readVaultFromDisk({ dotEnvFilesDirectory: '/this-is-an-invalid-path', logger: defaultTestLogger });

        expect(result).toEqual({});
    });

    it('should return the decoded vault object if .env-vault.json exists and can be parsed', () => {
        const result = readVaultFromDisk({ dotEnvFilesDirectory: TestFilesLocator.only_one_decryption_key, logger: defaultTestLogger });

        expect(result).toEqual({
            LOCAL: 'MmMzOTQ2ZDNhZWQwOGMzYmE4NTI3YWEwZmRhY2JiMDY=',
        });
    });

    it('should return an empty object if .env-vault.json exists but cannot be parsed', () => {
        const result = readVaultFromDisk({ dotEnvFilesDirectory: TestFilesLocator.invalid_vault_json, logger: defaultTestLogger });

        expect(result).toEqual({});
    });
});

describe('writeVaultToDisk', () => {
    it('should write the vault content to .env-vault.json file', (done) => {
        const envVaultContent: EnvVaultJsonData = { key: 'value' };
        writeVaultToDisk({ dotEnvFilesDirectory: TestFilesLocator.tests_fs_directory_location, logger: defaultTestLogger, envVaultContent });

        if (
            !expectFileToExistWithContent(
                `${TestFilesLocator.tests_fs_directory_location}/.env-vault.json`,
                JSON.stringify(envVaultContent, null, 4),
                done,
            )
        ) {
            return;
        }
        done();
    });
});

describe('writeEnvsToDisk', () => {
    it('should write environment files to disk', (done) => {
        const files = [
            { environmentName: 'DEV', decryptedStringContent: 'DEV_CONTENT' },
            { environmentName: 'PROD', decryptedStringContent: 'PROD_CONTENT' },
        ];

        writeEnvsToDisk({ dotEnvFilesDirectory: TestFilesLocator.tests_fs_directory_location, logger: defaultTestLogger, files });

        if (!expectFileToExistWithContent(`${TestFilesLocator.tests_fs_directory_location}/.env.dev`, 'DEV_CONTENT', done)) {
            return;
        }

        if (!expectFileToExistWithContent(`${TestFilesLocator.tests_fs_directory_location}/.env.prod`, 'PROD_CONTENT', done)) {
            return;
        }
        done();
    });
});

describe('encryptEnvFilesToVault', () => {
    const envKeysFileContent = `encryptionIV=m%252Fb%253Bp%257Dv-%257E%253CZ4%2521%253FwPaB.B%2522%2528%253A%2528Wy%257BCh%253AQ%2528%257EYYZ%257B%252Fe%255E2_%2521UyCmR%253A*nWEmzC%255B%257D1T7E%257BF%253D8MZ%2522%253E8TK%2528ggb%2521%255B%253APC%257B%252C%252CcmuZEBnPEjsVgFsgC*8T%253EA%2525P%253AAt8zKu%253A_N%252Cg%2523%255DGWeE%257D&encryptionKey=%253Er%2540P%253CRK_T6zd5Y*hq%2529C%255B%2523jw3%2523Kbqe7%253CbMqh%253D%257D%253F%255D%253AgMw%2540pUKPDpGpR%255DvM%257De%2522T%252CxbSSX%2524_sUf_3W%253EC%253A%2529q7%253FHNW%253BX%253A2f%252Cz%25233w5qG4k%255BkX%253AykV_2e%257Eb%253B%253Ac%2523q%253EymR%253E.Ja%252FT.A`;
    beforeEach(() => {
        fs.writeFileSync(`${TestFilesLocator.tests_fs_directory_location}/.env.keys`, `VAULT_KEY_LOCAL=${envKeysFileContent}`);
    });

    const testVaultKeys = decodeVaultKey(envKeysFileContent);

    it('should be able to encrypt some data in the vault', () => {
        fs.writeFileSync(`${TestFilesLocator.tests_fs_directory_location}/.env.local`, [`VAR_1=1`, `VAR_2=2`].join(os.EOL));

        const content = encryptEnvFilesToVault({
            dotEnvFilesDirectory: TestFilesLocator.tests_fs_directory_location,
            logger: defaultTestLogger,
            envVaultKeys: {
                LOCAL: testVaultKeys,
            },
        });

        expect(content).toEqual({ LOCAL: 'NTQxMzlmODQ4MGJlZTBkZjExMjAzZThhNDViNzZjYzg=' });
    });

    it('should be able to decrypt the vault', () => {
        fs.writeFileSync(`${TestFilesLocator.tests_fs_directory_location}/.env.local`, [`VAR_1=1`, `VAR_2=2`].join(os.EOL));
        const options: DefaultArguments = {
            dotEnvFilesDirectory: TestFilesLocator.tests_fs_directory_location,
            logger: defaultTestLogger,
        };
        const encryptedVault = encryptEnvFilesToVault({
            ...options,
            envVaultKeys: {
                LOCAL: testVaultKeys,
            },
        });
        writeVaultToDisk({ ...options, envVaultContent: encryptedVault });

        const content = decryptVault({
            ...options,
            envVaultKeys: {
                LOCAL: testVaultKeys,
            },
        });

        expect(content).toEqual({
            LOCAL: {
                environmentName: 'LOCAL',
                decrypted: true,
                data: {
                    VAR_1: '1',
                    VAR_2: '2',
                },
                encryptedStringContent: 'NTQxMzlmODQ4MGJlZTBkZjExMjAzZThhNDViNzZjYzg=',
                decryptedStringContent: 'VAR_1=1\nVAR_2=2',
            },
        });
    });
});
