import { convertToString } from './convert-to-string';

export const getEnvVarToAddInFile = (envVarName: string, envVarValue: unknown): string => {
    return `${envVarName}="${convertToString(envVarValue)}"`;
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

    return [
        { match: `${envVarName}="${oldEnvVarValue}"`, replacer: getReplacer(``) },
        { match: `${envVarName}=${oldEnvVarValue}`, replacer: getReplacer(``) },
    ];
};
