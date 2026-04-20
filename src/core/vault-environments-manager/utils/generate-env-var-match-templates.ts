import { convertToString } from './convert-to-string';

export const getEnvVarToAddInFile = (envVarName: string, envVarValue: unknown): string => {
    if (convertToString(envVarValue).includes(`\n`)) {
        return `${envVarName}="${convertToString(envVarValue)}"`;
    }
    return `${envVarName}=${convertToString(envVarValue)}`;
};

export const generateEnvVarMatchTemplates = (
    envVarName: string,
    oldEnvVarValue: unknown,
    newValue: { type: 'remove' } | { type: 'edit'; value: unknown },
) => {
    const getReplacer = (suffix: string = ''): string => {
        if (newValue.type === 'remove') {
            return ``;
        }

        return `${getEnvVarToAddInFile(envVarName, newValue.value)}${suffix}`;
    };

    if (!convertToString(oldEnvVarValue).length) {
        return [];
    }

    return [
        // With ""
        { match: `${envVarName}="${oldEnvVarValue}"\r\n`, replacer: getReplacer(`\r\n`) },
        { match: `${envVarName}="${oldEnvVarValue}"\n`, replacer: getReplacer(`\n`) },
        { match: `${envVarName}="${oldEnvVarValue}"`, replacer: getReplacer(``) },
        // Without ""
        { match: `${envVarName}=${oldEnvVarValue}\r\n`, replacer: getReplacer(`\r\n`) },
        { match: `${envVarName}=${oldEnvVarValue}\n`, replacer: getReplacer(`\n`) },
        { match: `${envVarName}=${oldEnvVarValue}`, replacer: getReplacer(``) },
    ];
};
