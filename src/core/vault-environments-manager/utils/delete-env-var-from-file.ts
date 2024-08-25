import { generateEnvVarMatchTemplates } from './generate-env-var-match-templates';

export const deleteEnvVarFromFile = ({
    envVarName,
    oldEnvVarValue,
    dotEnvFileContent,
}: {
    envVarName: string;
    oldEnvVarValue: unknown;
    dotEnvFileContent: string;
}): string => {
    for (const { match, replacer } of generateEnvVarMatchTemplates(envVarName, oldEnvVarValue, { type: 'remove' })) {
        dotEnvFileContent = dotEnvFileContent.replace(match, replacer);
    }

    return dotEnvFileContent;
};
