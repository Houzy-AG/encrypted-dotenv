import * as os from 'node:os';
import { generateEnvVarMatchTemplates, getEnvVarToAddInFile } from './generate-env-var-match-templates';
import { parse } from 'dotenv';

export const replaceOrInsertEnvVarInFile = ({
    envVarName,
    dotEnvFileContent,
    newEnvVarValue,
}: {
    envVarName: string;
    newEnvVarValue: unknown;
    dotEnvFileContent: string;
}): string => {
    const oldVarValue = parse(dotEnvFileContent)?.[envVarName] ?? ``;
    for (const { match, replacer } of generateEnvVarMatchTemplates(envVarName, oldVarValue, { type: 'edit', value: newEnvVarValue })) {
        if (dotEnvFileContent.indexOf(match) !== -1) {
            dotEnvFileContent = dotEnvFileContent.replace(match, replacer);
            return dotEnvFileContent;
        }
    }
    if (dotEnvFileContent.trim().length === 0) {
        dotEnvFileContent = getEnvVarToAddInFile(envVarName, newEnvVarValue);
    } else {
        dotEnvFileContent = `${dotEnvFileContent}${os.EOL}${getEnvVarToAddInFile(envVarName, newEnvVarValue)}`;
    }

    return dotEnvFileContent;
};
