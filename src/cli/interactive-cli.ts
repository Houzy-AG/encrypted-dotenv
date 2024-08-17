#!/usr/bin/env node
import { isNil } from 'lodash';
import * as process from 'process';
import * as yargs from 'yargs';
import { defaultLogger } from '../core/logger/encrypted-env-logger';
import { configure } from '../lib';
import * as backupVault from './commands/backup-vault.command';
import * as cleanupExtraEnvFiles from './commands/cleanup-extra-env-files.command';
import * as decryptVault from './commands/decrypt-vault.command';
import * as encryptVault from './commands/encrypt-vault.command';
import * as generateKey from './commands/generate-key.command';
import * as mergeBackupWithMain from './commands/merge-backup-with-main.command';

import * as reCreateVault from './commands/re-create-vault.command';
import * as rotateKeys from './commands/rotate-keys.command';
import { InteractiveCommandLineUi, MenuOption } from './interactive-command-line-ui';

const interactiveCli = new InteractiveCommandLineUi(defaultLogger);

const args = yargs.parseSync(process.argv);
const dotEnvFilesDirectory = (args.dotEnvFilesDirectory as string) || ``;

const run = async (): Promise<void> => {
    let selectedOption: MenuOption | null = MenuOption.Exit;
    const commandsByOption: Record<Exclude<MenuOption, MenuOption.Exit>, () => void | Promise<void>> = {
        [MenuOption.EncryptEnvFiles]: () => {
            encryptVault.run({ dotEnvFilesDirectory, logger: defaultLogger });
            interactiveCli.printSuccess();
        },
        [MenuOption.DecryptEnvFiles]: () => {
            decryptVault.run({ dotEnvFilesDirectory, logger: defaultLogger });
            interactiveCli.printSuccess();
        },
        [MenuOption.PrintEnvVars]: () => {
            configure({ dotEnvFilesDirectory, logger: defaultLogger });
            defaultLogger.log(JSON.stringify(process.env, null, 4));
            interactiveCli.printSuccess();
        },
        [MenuOption.GenerateKey]: () => {
            generateKey.run({ logger: defaultLogger });
            interactiveCli.printSuccess();
        },
        [MenuOption.RotateKeys]: () => {
            rotateKeys.run({ dotEnvFilesDirectory, logger: defaultLogger });
            interactiveCli.printSuccess();
        },
        [MenuOption.Recreate]: () => {
            reCreateVault.run({ dotEnvFilesDirectory, logger: defaultLogger });
            interactiveCli.printSuccess();
        },
        [MenuOption.CleanupExtraEnvFiles]: () => {
            cleanupExtraEnvFiles.run({ dotEnvFilesDirectory, logger: defaultLogger });
            interactiveCli.printSuccess();
        },
        [MenuOption.BackupVault]: () => {
            backupVault.run({ dotEnvFilesDirectory, logger: defaultLogger });
            interactiveCli.printSuccess();
        },
        [MenuOption.MergeEnvVaults]: async (): Promise<void> => {
            await mergeBackupWithMain.run({
                dotEnvFilesDirectory,
                logger: defaultLogger,
                askUserToDecideOnMergeConflict: (options) => interactiveCli.askForAnswer(options),
            });
        },
    };

    do {
        selectedOption = await interactiveCli.askForMenuOption();
        if (!isNil(selectedOption) && selectedOption !== MenuOption.Exit) {
            await commandsByOption[selectedOption]();
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
