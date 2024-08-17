#!/usr/bin/env node
import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as process from 'process';
import { configure } from '../core/configure';
import { defaultLogger } from '../core/logger/encrypted-env-logger';
import { InteractiveCommandLineUi } from './interactive-command-line-ui';

import * as reCreateVault from './commands/re-create-vault.command';
import * as encryptVault from './commands/encrypt-vault.command';
import * as decryptVault from './commands/decrypt-vault.command';
import * as rotateKeys from './commands/rotate-keys.command';
import * as generateKey from './commands/generate-key.command';
import * as cleanupExtraEnvFiles from './commands/cleanup-extra-env-files.command';
import * as backupVault from './commands/backup-vault.command';
import * as mergeBackupWithMain from './commands/merge-backup-with-main.command';

const commonArguments = yargs.positional('dotEnvFilesDirectory', {
    describe: `Directory where dot env files are placed. It's relative to process.cwd()`,
    default: ``,
    type: 'string',
    desc: `Directory where dot env files are placed. It's relative to process.cwd()`,
    normalize: true,
});

const commonArgumentsBuilder = (): typeof commonArguments => commonArguments;
const interactiveCli = new InteractiveCommandLineUi(defaultLogger);

yargs(hideBin(process.argv))
    .command({
        command: `re-create [dotEnvFilesDirectory]`,
        describe: `Recreates Encryption Keys for '.env.*' files and encrypts them into a new vault\r\n`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            defaultLogger.info(`Recreate Encryption Keys, Recreate Encryption Vault using new keys`);
            reCreateVault.run({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory, logger: defaultLogger });
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `encrypt [dotEnvFilesDirectory]`,
        describe: `Encrypt Vault using encryption keys present in process.env | .env | .env.keys\r\n`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            defaultLogger.info(`Encrypt Vault using encryption keys present in process.env | .env | .env.keys`);
            encryptVault.run({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory, logger: defaultLogger });
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `decrypt [dotEnvFilesDirectory]`,
        describe: `Decrypt Vault using encryption keys present in process.env | .env | .env.keys\r\n`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            defaultLogger.info(`Encrypt Vault using encryption keys present in process.env | .env | .env.keys`);
            decryptVault.run({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory, logger: defaultLogger });
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `rotate-keys [dotEnvFilesDirectory]`,
        describe: `Rotate Encryption Keys.\r\n Encryption keys can be passed using process.env | .env | .env.keys.\r\n They will be dumped into .env.keys after rotation`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            defaultLogger.info(`Rotate Encryption Keys`);
            rotateKeys.run({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory, logger: defaultLogger });
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `print-env-vars [dotEnvFilesDirectory]`,
        describe: `Prints the environment variables in the current project\r\n`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            configure({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory, logger: defaultLogger });
            defaultLogger.log(JSON.stringify(process.env, null, 4));
        },
    })
    .command({
        command: `generate-new-key`,
        describe: `Generates a new encryption key.\r\n The key can be used for encrypting a possible new environment.\r\n`,
        handler: (): void => {
            defaultLogger.info(`Encryption Key:`);
            generateKey.run({ logger: defaultLogger });
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `cleanup-env-files [dotEnvFilesDirectory]`,
        describe: `Cleanup extra env files.\r\n The key can be used for deleting all .env.* files.\r\n`,
        handler: (argv): void => {
            cleanupExtraEnvFiles.run({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory, logger: defaultLogger });
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `backup-vault [dotEnvFilesDirectory]`,
        describe: `Create a backup copy of env vault.\r\n This can be used before merging remote branches.\r\n`,
        handler: (argv): void => {
            backupVault.run({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory, logger: defaultLogger });
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `merge-vaults [dotEnvFilesDirectory]`,
        describe: `Create a backup copy of env vault.\r\n This can be used before merging remote branches.\r\n`,
        handler: async (argv): Promise<void> => {
            await mergeBackupWithMain.run({
                dotEnvFilesDirectory: argv.dotEnvFilesDirectory,
                logger: defaultLogger,
                askUserToDecideOnMergeConflict: (options) => interactiveCli.askForAnswer(options),
            });
            defaultLogger.info(`Done`);
        },
    })
    .wrap(120)
    .parse();
