import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import * as os from 'os';

export enum MenuOptions {
    EncryptEnvFiles = `1`,
    DecryptEnvFiles = `2`,
    RotateKeys = `3`,
    Create = `4`,
    Exit = `5`,
}

const menuLabels: Record<MenuOptions, string> = {
    [MenuOptions.EncryptEnvFiles]: 'Encrypt Env Files',
    [MenuOptions.DecryptEnvFiles]: 'Decrypt Env Files',
    [MenuOptions.RotateKeys]: 'Rotate Vault Keys',
    [MenuOptions.Create]: 'Create Vault',
    [MenuOptions.Exit]: 'Exit',
};

export class CommandLineUi {
    public async askForMenuOption(): Promise<MenuOptions> {
        const validIds = Object.values(MenuOptions);
        const questions = [
            {
                name: 'choseOption',
                type: 'rawlist',
                message: 'Chose option',
                choices: Object.values(menuLabels),
                validate: (value): boolean | string => {
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
            return item[0] as MenuOptions;
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
