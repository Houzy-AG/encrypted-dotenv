import * as os from 'node:os';
import { generateEnvVarMatchTemplates, getEnvVarToAddInFile } from './generate-env-var-match-templates';

export const replaceOrInsertEnvVarInFile = ({
    envVarName,
    oldEnvVarValue,
    dotEnvFileContent,
    newEnvVarValue,
}: {
    envVarName: string;
    oldEnvVarValue: unknown;
    newEnvVarValue: unknown;
    dotEnvFileContent: string;
}): string => {
    let wasReplaced = false;
    for (const { match, replacer } of generateEnvVarMatchTemplates(envVarName, oldEnvVarValue, { type: 'edit', value: newEnvVarValue })) {
        if (dotEnvFileContent.indexOf(match) !== -1) {
            dotEnvFileContent = dotEnvFileContent.replace(match, replacer);
            wasReplaced = true;
        }
    }
    if (!wasReplaced) {
        if (dotEnvFileContent.trim().length === 0) {
            dotEnvFileContent = getEnvVarToAddInFile(envVarName, newEnvVarValue);
        } else {
            dotEnvFileContent = `${dotEnvFileContent}${os.EOL}${getEnvVarToAddInFile(envVarName, newEnvVarValue)}`;
        }
    }

    return dotEnvFileContent;
};
