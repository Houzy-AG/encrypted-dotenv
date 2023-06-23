#!/usr/bin/env node
import * as process from 'process';
import * as yargs from 'yargs';
import { configure } from '../lib';
import { InteractiveCommandLineUi, MenuOptions } from './interactive-command-line-ui';
import * as createVault from './commands/create-vault.command';
import * as encryptVault from './commands/encrypt-vault.command';
import * as decryptVault from './commands/decrypt-vault.command';
import * as rotateKeys from './commands/rotate-keys.command';
import * as generateKey from './commands/generate-key.command';

const interactiveCli = new InteractiveCommandLineUi();

const args = yargs.parseSync(process.argv);
const dotEnvFilesDirectory = (args.dotEnvFilesDirectory as string) || ``;

const run = async (): Promise<void> => {
    let selectedOption = MenuOptions.Exit;
    do {
        selectedOption = await interactiveCli.askForMenuOption();

        switch (selectedOption) {
            case MenuOptions.Create:
                createVault.run({ dotEnvFilesDirectory });
                interactiveCli.printSuccess();
                break;
            case MenuOptions.RotateKeys:
                rotateKeys.run({ dotEnvFilesDirectory });
                interactiveCli.printSuccess();
                break;
            case MenuOptions.EncryptEnvFiles:
                encryptVault.run({ dotEnvFilesDirectory });
                interactiveCli.printSuccess();
                break;
            case MenuOptions.GenerateKey:
                generateKey.run();
                interactiveCli.printSuccess();
                break;
            case MenuOptions.PrintEnvVars:
                configure({ dotEnvFilesDirectory });
                console.log(process.env);
                interactiveCli.printSuccess();
                break;
            case MenuOptions.DecryptEnvFiles:
                decryptVault.run({ dotEnvFilesDirectory });
                interactiveCli.printSuccess();
                break;
        }
    } while (selectedOption !== MenuOptions.Exit);

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
