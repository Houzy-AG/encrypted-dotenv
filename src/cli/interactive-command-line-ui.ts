import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import * as os from 'os';

export enum MenuOption {
    EncryptEnvFiles = `1`,
    DecryptEnvFiles = `2`,
    PrintEnvVars = `3`,
    GenerateKey = `4`,
    RotateKeys = `5`,
    Recreate = `6`,
    Exit = `7`,
}

const menuLabels: Record<MenuOption, string> = {
    [MenuOption.EncryptEnvFiles]: 'Encrypt Env Files',
    [MenuOption.DecryptEnvFiles]: 'Decrypt Env Files',
    [MenuOption.PrintEnvVars]: 'Print Env Vars',
    [MenuOption.GenerateKey]: 'Generate Key',
    [MenuOption.RotateKeys]: 'Rotate Vault Keys',
    [MenuOption.Recreate]: 'Recreate Vault',
    [MenuOption.Exit]: 'Exit',
};

export class InteractiveCommandLineUi {
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

    public printByeMessage(): void {
        console.log(chalk.yellow(`Exit ${os.EOL}`));
    }

    public printSuccess(): void {
        console.log(chalk.yellow(`Task completed Successfully`));
    }
}
