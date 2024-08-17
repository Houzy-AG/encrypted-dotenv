#!/usr/bin/env node
import * as process from 'process';
import * as yargs from 'yargs';
import { defaultLogger } from '../core/logger/encrypted-env-logger';
import { configure } from '../lib';
import { InteractiveCommandLineUi, MenuOption } from './interactive-command-line-ui';
import * as reCreateVault from './commands/re-create-vault.command';
import * as encryptVault from './commands/encrypt-vault.command';
import * as decryptVault from './commands/decrypt-vault.command';
import * as rotateKeys from './commands/rotate-keys.command';
import * as generateKey from './commands/generate-key.command';
import * as cleanupExtraEnvFiles from './commands/cleanup-extra-env-files.command';

const interactiveCli = new InteractiveCommandLineUi(defaultLogger);

const args = yargs.parseSync(process.argv);
const dotEnvFilesDirectory = (args.dotEnvFilesDirectory as string) || ``;

const run = async (): Promise<void> => {
    let selectedOption: MenuOption | null = MenuOption.Exit;
    do {
        selectedOption = await interactiveCli.askForMenuOption();

        switch (selectedOption) {
            case MenuOption.Recreate:
                reCreateVault.run({ dotEnvFilesDirectory, logger: defaultLogger });
                interactiveCli.printSuccess();
                break;
            case MenuOption.RotateKeys:
                rotateKeys.run({ dotEnvFilesDirectory, logger: defaultLogger });
                interactiveCli.printSuccess();
                break;
            case MenuOption.EncryptEnvFiles:
                encryptVault.run({ dotEnvFilesDirectory, logger: defaultLogger });
                interactiveCli.printSuccess();
                break;
            case MenuOption.GenerateKey:
                generateKey.run({ logger: defaultLogger });
                interactiveCli.printSuccess();
                break;
            case MenuOption.PrintEnvVars:
                configure({ dotEnvFilesDirectory, logger: defaultLogger });
                defaultLogger.log(JSON.stringify(process.env, null, 4));
                interactiveCli.printSuccess();
                break;
            case MenuOption.DecryptEnvFiles:
                decryptVault.run({ dotEnvFilesDirectory, logger: defaultLogger });
                interactiveCli.printSuccess();
                break;
            case MenuOption.CleanupExtraEnvFiles:
                cleanupExtraEnvFiles.run({ dotEnvFilesDirectory, logger: defaultLogger });
                interactiveCli.printSuccess();
                break;
        }
    } while (selectedOption !== MenuOption.Exit);

    interactiveCli.printByeMessage();
    process.exit(0);
};

run().catch((e) => {
    defaultLogger.error('GlobalErrorHandler', e);
    process.exit(1);
});

process.on('SIGINT', () => {
    interactiveCli.printByeMessage();
});
