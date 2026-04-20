import { GENERAL_DOT_ENV_FILE_NAME } from './consts';
import { mapDotEnvFileNameToEnvironmentName } from './map-dot-env-file-name-to-environment-name';

describe(mapDotEnvFileNameToEnvironmentName.name, () => {
    test('should return environment name when given a valid .env file name', () => {
        const fileName = '.env.prod';

        const result = mapDotEnvFileNameToEnvironmentName(fileName);

        expect(result).toBe('PROD');
    });

    test('should return empty string when given an invalid .env file name', () => {
        const result = mapDotEnvFileNameToEnvironmentName(GENERAL_DOT_ENV_FILE_NAME);

        expect(result).toBe(null);
    });
});
