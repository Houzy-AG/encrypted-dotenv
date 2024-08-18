#!/usr/bin/env node
import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as process from 'process';
import { createVaultEnvironmentsManager } from '../core/create-vault-environments-manager';
import { defaultLogger } from '../core/logger/encrypted-env-logger';
import { InteractiveCommandLineUi } from './interactive-command-line-ui';

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
            const vaultEnvironmentsManager = createVaultEnvironmentsManager({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            defaultLogger.info(`Recreate Encryption Keys, Recreate Encryption Vault using new keys`);
            vaultEnvironmentsManager.reCreate();
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `encrypt [dotEnvFilesDirectory]`,
        describe: `Encrypt Vault using encryption keys present in process.env | .env | .env.keys\r\n`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            defaultLogger.info(`Encrypt Vault using encryption keys present in process.env | .env | .env.keys`);
            const vaultEnvironmentsManager = createVaultEnvironmentsManager({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            vaultEnvironmentsManager.encryptDotEnvFiles();
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `decrypt [dotEnvFilesDirectory]`,
        describe: `Decrypt Vault using encryption keys present in process.env | .env | .env.keys\r\n`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            defaultLogger.info(`Encrypt Vault using encryption keys present in process.env | .env | .env.keys`);
            const vaultEnvironmentsManager = createVaultEnvironmentsManager({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            vaultEnvironmentsManager.decryptDotEnvFiles();
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `rotate-keys [dotEnvFilesDirectory]`,
        describe: `Rotate Encryption Keys.\r\n Encryption keys can be passed using process.env | .env | .env.keys.\r\n They will be dumped into .env.keys after rotation`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            defaultLogger.info(`Rotate Encryption Keys`);
            const vaultEnvironmentsManager = createVaultEnvironmentsManager({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            vaultEnvironmentsManager.rotateEncryptionKeys();
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `print-env-vars [dotEnvFilesDirectory]`,
        describe: `Prints the environment variables in the current project\r\n`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            defaultLogger.info(`Env vars for current system`);
            const vaultEnvironmentsManager = createVaultEnvironmentsManager({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            vaultEnvironmentsManager.configureProcessEnv();
            defaultLogger.info(JSON.stringify(process.env, null, 4));
        },
    })
    .command({
        command: `add-missing-env-files [dotEnvFilesDirectory]`,
        describe: `Adds missing .env.* files to vault.\r\n The key can be used for encrypting a possible new environment.\r\n`,
        handler: (argv): void => {
            defaultLogger.info(`Encryption Key:`);
            const vaultEnvironmentsManager = createVaultEnvironmentsManager({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            vaultEnvironmentsManager.addMissingEnvironments();
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `cleanup-env-files [dotEnvFilesDirectory]`,
        describe: `Cleanup extra env files.\r\n The key can be used for deleting all .env.* files.\r\n`,
        handler: (argv): void => {
            const vaultEnvironmentsManager = createVaultEnvironmentsManager({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            vaultEnvironmentsManager.removeDotEnvFiles();
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `backup-vault [dotEnvFilesDirectory]`,
        describe: `Create a backup copy of env vault.\r\n This can be used before merging remote branches.\r\n`,
        handler: (argv): void => {
            const vaultEnvironmentsManager = createVaultEnvironmentsManager({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            vaultEnvironmentsManager.backup();
            defaultLogger.info(`Done`);
        },
    })
    .command({
        command: `merge-vaults [dotEnvFilesDirectory]`,
        describe: `Create a backup copy of env vault.\r\n This can be used before merging remote branches.\r\n`,
        handler: async (argv): Promise<void> => {
            const vaultEnvironmentsManager = createVaultEnvironmentsManager({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            await vaultEnvironmentsManager.mergeMainVaultWithBackup((options) => interactiveCli.askForAnswer(options));
            defaultLogger.info(`Done`);
        },
    })
    .wrap(120)
    .parse();
