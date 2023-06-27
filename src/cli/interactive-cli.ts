#!/usr/bin/env node
import * as process from 'process';
import * as yargs from 'yargs';
import { configure } from '../lib';
import { InteractiveCommandLineUi, MenuOption } from './interactive-command-line-ui';
import * as reCreateVault from './commands/re-create-vault.command';
import * as encryptVault from './commands/encrypt-vault.command';
import * as decryptVault from './commands/decrypt-vault.command';
import * as rotateKeys from './commands/rotate-keys.command';
import * as generateKey from './commands/generate-key.command';

const interactiveCli = new InteractiveCommandLineUi();

const args = yargs.parseSync(process.argv);
const dotEnvFilesDirectory = (args.dotEnvFilesDirectory as string) || ``;

const run = async (): Promise<void> => {
    let selectedOption: MenuOption | null = MenuOption.Exit;
    do {
        selectedOption = await interactiveCli.askForMenuOption();

        switch (selectedOption) {
            case MenuOption.Recreate:
                reCreateVault.run({ dotEnvFilesDirectory });
                interactiveCli.printSuccess();
                break;
            case MenuOption.RotateKeys:
                rotateKeys.run({ dotEnvFilesDirectory });
                interactiveCli.printSuccess();
                break;
            case MenuOption.EncryptEnvFiles:
                encryptVault.run({ dotEnvFilesDirectory });
                interactiveCli.printSuccess();
                break;
            case MenuOption.GenerateKey:
                generateKey.run();
                interactiveCli.printSuccess();
                break;
            case MenuOption.PrintEnvVars:
                configure({ dotEnvFilesDirectory });
                console.log(process.env);
                interactiveCli.printSuccess();
                break;
            case MenuOption.DecryptEnvFiles:
                decryptVault.run({ dotEnvFilesDirectory });
                interactiveCli.printSuccess();
                break;
        }
    } while (selectedOption !== MenuOption.Exit);

    interactiveCli.printByeMessage();
    process.exit(0);
};

run().catch((e) => {
    console.error('GlobalErrorHandler', e);
    process.exit(1);
});

process.on('SIGINT', () => {
    interactiveCli.printByeMessage();
});
