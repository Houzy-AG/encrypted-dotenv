import { parse } from 'dotenv';
import { generateEnvVarMatchTemplates } from './generate-env-var-match-templates';

export const deleteEnvVarFromFile = ({
    envVarName,
    dotEnvFileContent
}: {
    envVarName: string;
    dotEnvFileContent: string;
}): string => {
    const oldEnvVarValue = parse(dotEnvFileContent)?.[envVarName];
    for (const { match, replacer } of generateEnvVarMatchTemplates(envVarName, oldEnvVarValue, { type: 'remove' })) {
        dotEnvFileContent = dotEnvFileContent.replace(match, replacer);
    }

    return dotEnvFileContent;
};
