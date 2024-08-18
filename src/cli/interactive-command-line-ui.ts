import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import * as os from 'os';
import { EncryptedEnvLogger } from '../core/logger/encrypted-env-logger';

export enum MenuOption {
    EncryptEnvFiles = `1`,
    DecryptEnvFiles = `2`,
    PrintEnvVars = `3`,
    AddMissingDotEnvFiles = `4`,
    RotateKeys = `5`,
    Recreate = `6`,
    CleanupExtraEnvFiles = `7`,
    BackupVault = `8`,
    MergeEnvVaults = `9`,
    Exit = `10`,
}

const menuLabels: Record<MenuOption, string> = {
    [MenuOption.EncryptEnvFiles]: 'Encrypt Env Files',
    [MenuOption.DecryptEnvFiles]: 'Decrypt Env Files',
    [MenuOption.PrintEnvVars]: 'Print Env Vars',
    [MenuOption.AddMissingDotEnvFiles]: 'Add Missing Env files to vault',
    [MenuOption.RotateKeys]: 'Rotate Vault Keys',
    [MenuOption.Recreate]: 'Recreate Vault',
    [MenuOption.CleanupExtraEnvFiles]: 'Cleanup extra env files',
    [MenuOption.BackupVault]: 'Backup Vault',
    [MenuOption.MergeEnvVaults]: 'Merge Env Vaults',
    [MenuOption.Exit]: 'Exit',
};

export interface MergeQuestion {
    key: string;
    label: string;
}

export interface MergeConflictQuestion {
    question: string;
    options: MergeQuestion[];
}

export class InteractiveCommandLineUi {
    constructor(private logger: EncryptedEnvLogger) {}

    public async askForMenuOption(): Promise<MenuOption | null> {
        const validIds = Object.values(MenuOption);
        const questions = [
            {
                name: 'choseOption',
                type: 'rawlist',
                message: 'Chose option',
                choices: Object.values(menuLabels),
                validate: (value: string): boolean | string => {
                    if (validIds.includes(value)) {
                        return true;
                    } else {
                        return 'Please select one of the options';
                    }
                },
            },
        ];
        const option = await inquirer.prompt(questions);
        const item = Object.entries(menuLabels).find(([_, label]) => label === option.choseOption);
        if (item?.length) {
            return item[0] as MenuOption;
        }
        return null;
    }

    public async askForAnswer(questionsInfo: MergeConflictQuestion): Promise<string> {
        const { question, options } = questionsInfo;
        const labelsList = options.map((item) => item.label);
        const questions = [
            {
                name: 'choseOption',
                type: 'rawlist',
                message: question,
                choices: labelsList,
                validate: (value: string): boolean | string => {
                    if (labelsList.includes(value)) {
                        return true;
                    } else {
                        return 'Please select one of the options';
                    }
                },
            },
        ];
        const option = await inquirer.prompt(questions);
        const item = options.find((optionInfo) => optionInfo.label === option.choseOption);
        if (item) {
            return item.key;
        }
        return this.askForAnswer(questionsInfo);
    }

    public printByeMessage(): void {
        this.logger.log(chalk.yellow(`Exit ${os.EOL}`));
    }

    public printSuccess(): void {
        this.logger.log(chalk.yellow(`Task completed Successfully`));
    }
}
