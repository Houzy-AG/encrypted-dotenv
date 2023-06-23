import * as fs from 'fs';
import { findAllDotEnvFiles, getEnvFilesDirectory, getEnvironmentNameFromFileName, getEnvironmentVariableFromLocalDotEnvFile } from './file-system';

jest.mock('fs');

describe('getEnvFilesDirectory', () => {
    test('should return current working directory when dotEnvFilesDirectory is not provided', () => {
        const cwd = '/path/to/project';
        process.cwd = jest.fn(() => cwd);

        const result = getEnvFilesDirectory(undefined);

        expect(result).toBe(cwd);
    });

    test('should return resolved directory path when dotEnvFilesDirectory is provided', () => {
        const dotEnvFilesDirectory = 'config/env';
        const cwd = '/path/to/project';
        process.cwd = jest.fn(() => cwd);
        const expectedPath = '/path/to/project/config/env';

        const result = getEnvFilesDirectory(dotEnvFilesDirectory);

        expect(result).toBe(expectedPath);
    });
});

describe('getEnvironmentVariableFromLocalDotEnvFile', () => {
    test('should return an empty object when .env file does not exist', () => {
        const dotEnvFilesDirectory = 'config/env';
        const filePath = '/path/to/project/config/env/.env';

        jest.spyOn(fs, 'existsSync').mockReturnValue(false);

        const result = getEnvironmentVariableFromLocalDotEnvFile(dotEnvFilesDirectory);

        expect(fs.existsSync).toHaveBeenCalledWith(filePath);
        expect(result).toEqual({});
    });

    test('should return parsed environment variables when .env file exists', () => {
        const dotEnvFilesDirectory = 'config/env';
        const filePath = '/path/to/project/config/env/.env';
        const fileContent = 'KEY1=value1\nKEY2=value2';

        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValue(fileContent);
        jest.mock('dotenv', () => ({
            parse: jest.fn(() => ({
                KEY1: 'value1',
                KEY2: 'value2',
            })),
        }));

        const result = getEnvironmentVariableFromLocalDotEnvFile(dotEnvFilesDirectory);

        expect(fs.existsSync).toHaveBeenCalledWith(filePath);
        expect(fs.readFileSync).toHaveBeenCalledWith(filePath);
        expect(result).toEqual({
            KEY1: 'value1',
            KEY2: 'value2',
        });
    });
});

describe('findAllDotEnvFiles', () => {
    test('should return an empty array when no .env files are found', () => {
        const dotEnvFilesDirectory = 'config/env';
        const envFilesDirectory = '/path/to/project/config/env';

        jest.spyOn(fs, 'readdirSync').mockReturnValue([]);

        const result = findAllDotEnvFiles(dotEnvFilesDirectory);

        expect(result).toEqual([]);
        expect(fs.readdirSync).toHaveBeenCalledWith(envFilesDirectory);
    });

    test('should return an array of file paths and names for found .env files', () => {
        const dotEnvFilesDirectory = 'config/env';
        const envFilesDirectory = '/path/to/project/config/env';
        const fileNames = ['.env.dev', '.env.prod'];

        jest.spyOn(fs, 'readdirSync').mockReturnValue(fileNames as unknown as fs.Dirent[]);
        jest.mock('path', () => ({
            resolve: jest.fn((...args) => args.join('/')),
        }));

        const result = findAllDotEnvFiles(dotEnvFilesDirectory);

        expect(result).toEqual([
            {
                path: '/path/to/project/config/env/.env.dev',
                fileName: '.env.dev',
            },
            {
                path: '/path/to/project/config/env/.env.prod',
                fileName: '.env.prod',
            },
        ]);
        expect(fs.readdirSync).toHaveBeenCalledWith(envFilesDirectory);
    });
});

describe('getEnvironmentNameFromFileName', () => {
    test('should return environment name when given a valid .env file name', () => {
        const fileName = '.env.prod';

        const result = getEnvironmentNameFromFileName(fileName);

        expect(result).toBe('PROD');
    });

    test('should return empty string when given an invalid .env file name', () => {
        const fileName = '.env';

        const result = getEnvironmentNameFromFileName(fileName);

        expect(result).toBe(null);
    });
});
