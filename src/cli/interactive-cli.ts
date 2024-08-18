#!/usr/bin/env node
import { isNil } from 'lodash';
import * as process from 'process';
import * as yargs from 'yargs';
import { createVaultEnvironmentsManager } from '../core/create-vault-environments-manager';
import { defaultLogger } from '../core/logger/encrypted-env-logger';
import { VaultEnvironmentsManager } from '../core/vault-environments-manager/vault-environments-manager';
import { InteractiveCommandLineUi, MenuOption } from './interactive-command-line-ui';

const interactiveCli = new InteractiveCommandLineUi(defaultLogger);

const args = yargs.parseSync(process.argv);
const dotEnvFilesDirectory = (args.dotEnvFilesDirectory as string) || ``;

const run = async (): Promise<void> => {
    let selectedOption: MenuOption | null = MenuOption.Exit;
    const commandsByOption: Record<
        Exclude<MenuOption, MenuOption.Exit>,
        (vaultEnvironmentsManager: VaultEnvironmentsManager) => void | Promise<void>
    > = {
        [MenuOption.EncryptEnvFiles]: (vaultEnvironmentsManager: VaultEnvironmentsManager) => {
            vaultEnvironmentsManager.encryptDotEnvFiles();
        },
        [MenuOption.DecryptEnvFiles]: (vaultEnvironmentsManager: VaultEnvironmentsManager) => {
            vaultEnvironmentsManager.decryptDotEnvFiles();
        },
        [MenuOption.PrintEnvVars]: (vaultEnvironmentsManager: VaultEnvironmentsManager) => {
            vaultEnvironmentsManager.configureProcessEnv();
            defaultLogger.info(JSON.stringify(process.env, null, 4));
        },
        [MenuOption.AddMissingDotEnvFiles]: (vaultEnvironmentsManager: VaultEnvironmentsManager) => {
            vaultEnvironmentsManager.addMissingEnvironments();
        },
        [MenuOption.RotateKeys]: (vaultEnvironmentsManager: VaultEnvironmentsManager) => {
            vaultEnvironmentsManager.rotateEncryptionKeys();
        },
        [MenuOption.Recreate]: (vaultEnvironmentsManager: VaultEnvironmentsManager) => {
            vaultEnvironmentsManager.reCreate();
        },
        [MenuOption.CleanupExtraEnvFiles]: (vaultEnvironmentsManager: VaultEnvironmentsManager) => {
            vaultEnvironmentsManager.removeDotEnvFiles();
        },
        [MenuOption.BackupVault]: (vaultEnvironmentsManager: VaultEnvironmentsManager) => {
            vaultEnvironmentsManager.backup();
        },
        [MenuOption.MergeEnvVaults]: async (vaultEnvironmentsManager: VaultEnvironmentsManager): Promise<void> => {
            return vaultEnvironmentsManager.mergeMainVaultWithBackup((options) => interactiveCli.askForAnswer(options));
        },
    };

    do {
        selectedOption = await interactiveCli.askForMenuOption();

        const vaultEnvironmentsManager = createVaultEnvironmentsManager({
            dotEnvFilesDirectory,
            logger: defaultLogger,
        });
        if (!isNil(selectedOption) && selectedOption !== MenuOption.Exit) {
            await commandsByOption[selectedOption](vaultEnvironmentsManager);
            interactiveCli.printSuccess();
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
