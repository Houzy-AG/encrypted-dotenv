import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { decryptVault, encryptEnvFilesToVault, readVaultFromDisk, writeEnvsToDisk, writeVaultToDisk } from './vault';
import * as vaultDetails from './vault';
import * as fileSystemDetails from './file-system';
import { decodeVaultKey } from './vault-keys';
import { DecodedVault } from './vault-types';

describe('readVaultFromDisk', () => {
    beforeEach(() => {
        jest.spyOn(process, 'cwd').mockReturnValueOnce('');
        jest.spyOn(console, 'info').mockReturnValue();
        jest.spyOn(console, 'error').mockReturnValue();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return an empty object if .env-vault.json does not exist', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);

        const result = readVaultFromDisk({ dotEnvFilesDirectory: '/path/to/env/files' });

        expect(result).toEqual({});
    });

    it('should return the decoded vault object if .env-vault.json exists and can be parsed', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(JSON.stringify({ key: 'value' }));

        const result = readVaultFromDisk({ dotEnvFilesDirectory: '/path/to/env/files' });

        expect(result).toEqual({ key: 'value' });
    });

    it('should return an empty object if .env-vault.json exists but cannot be parsed', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValueOnce('invalid JSON');

        const result = readVaultFromDisk({ dotEnvFilesDirectory: '/path/to/env/files' });

        expect(result).toEqual({});
    });
});

describe('writeVaultToDisk', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should write the vault content to .env-vault.json file', () => {
        jest.spyOn(process, 'cwd').mockReturnValueOnce('');
        jest.spyOn(console, 'info').mockReturnValue();
        jest.spyOn(console, 'error').mockReturnValue();
        jest.spyOn(fs, 'writeFileSync').mockReturnValue();
        jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
        jest.spyOn(path, 'join').mockReturnValueOnce('/path/to/env/files/.env-vault.json');

        const envVaultContent: DecodedVault = { key: 'value' };
        writeVaultToDisk('/path/to/env/files', envVaultContent);

        expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
        expect(fs.writeFileSync).toHaveBeenCalledWith('/path/to/env/files/.env-vault.json', JSON.stringify(envVaultContent, null, 4));
    });
});

jest.mock('fs');

describe('writeEnvsToDisk', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should write environment files to disk', () => {
        jest.spyOn(process, 'cwd').mockReturnValueOnce('');
        jest.spyOn(console, 'info').mockReturnValue();
        jest.spyOn(console, 'error').mockReturnValue();
        const dotEnvFilesDirectory = '/path/to/dotenv';
        const files = [
            { environmentName: 'DEV', decryptedStringContent: 'DEV_CONTENT' },
            { environmentName: 'PROD', decryptedStringContent: 'PROD_CONTENT' },
        ];

        writeEnvsToDisk(dotEnvFilesDirectory, files);

        expect(fs.writeFileSync).toHaveBeenCalledTimes(2);

        expect(fs.writeFileSync).toHaveBeenCalledWith(path.join(dotEnvFilesDirectory, '.env.dev'), 'DEV_CONTENT');

        expect(fs.writeFileSync).toHaveBeenCalledWith(path.join(dotEnvFilesDirectory, '.env.prod'), 'PROD_CONTENT');
    });
});

describe('encryptEnvFilesToVault', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const testVaultKeys = decodeVaultKey(
        `encryptionIV=m%252Fb%253Bp%257Dv-%257E%253CZ4%2521%253FwPaB.B%2522%2528%253A%2528Wy%257BCh%253AQ%2528%257EYYZ%257B%252Fe%255E2_%2521UyCmR%253A*nWEmzC%255B%257D1T7E%257BF%253D8MZ%2522%253E8TK%2528ggb%2521%255B%253APC%257B%252C%252CcmuZEBnPEjsVgFsgC*8T%253EA%2525P%253AAt8zKu%253A_N%252Cg%2523%255DGWeE%257D&encryptionKey=%253Er%2540P%253CRK_T6zd5Y*hq%2529C%255B%2523jw3%2523Kbqe7%253CbMqh%253D%257D%253F%255D%253AgMw%2540pUKPDpGpR%255DvM%257De%2522T%252CxbSSX%2524_sUf_3W%253EC%253A%2529q7%253FHNW%253BX%253A2f%252Cz%25233w5qG4k%255BkX%253AykV_2e%257Eb%253B%253Ac%2523q%253EymR%253E.Ja%252FT.A`,
    );

    it('should be able to encrypt some data in the vault', () => {
        jest.spyOn(vaultDetails, 'readVaultFromDisk').mockReturnValue({});
        jest.spyOn(fileSystemDetails, 'findAllDotEnvFiles').mockReturnValue([{ path: `path/to/env/.env.local`, fileName: '.env.local' }]);
        jest.spyOn(fs, 'readFileSync').mockReturnValue('TEST_VAR=1');

        const content = encryptEnvFilesToVault({
            dotEnvFilesDirectory: ``,
            envVaultKeys: {
                LOCAL: testVaultKeys,
            },
        });

        expect(content).toEqual({ LOCAL: 'MmMzOTQ2ZDNhZWQwOGMzYmE4NTI3YWEwZmRhY2JiMDY=' });
    });

    it('should be able to decrypt the vault', () => {
        jest.spyOn(vaultDetails, 'readVaultFromDisk').mockReturnValue({ LOCAL: 'MmMzOTQ2ZDNhZWQwOGMzYmE4NTI3YWEwZmRhY2JiMDY=' });

        const content = decryptVault({
            dotEnvFilesDirectory: ``,
            envVaultKeys: {
                LOCAL: testVaultKeys,
            },
        });

        expect(content).toEqual({
            LOCAL: {
                environmentName: 'LOCAL',
                decrypted: true,
                data: { TEST_VAR: '1' },
                encryptedStringContent: 'MmMzOTQ2ZDNhZWQwOGMzYmE4NTI3YWEwZmRhY2JiMDY=',
                decryptedStringContent: 'TEST_VAR=1',
            },
        });
    });
});
