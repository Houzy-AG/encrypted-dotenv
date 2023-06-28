#!/usr/bin/env node
import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as process from 'process';
import { configure } from '../core/configure';

import * as reCreateVault from './commands/re-create-vault.command';
import * as encryptVault from './commands/encrypt-vault.command';
import * as decryptVault from './commands/decrypt-vault.command';
import * as rotateKeys from './commands/rotate-keys.command';
import * as generateKey from './commands/generate-key.command';

const commonArguments = yargs.positional('dotEnvFilesDirectory', {
    describe: `Directory where dot env files are placed. It's relative to process.cwd()`,
    default: ``,
    type: 'string',
    desc: `Directory where dot env files are placed. It's relative to process.cwd()`,
    normalize: true,
});

const commonArgumentsBuilder = (): typeof commonArguments => commonArguments;

yargs(hideBin(process.argv))
    .command({
        command: `re-create [dotEnvFilesDirectory]`,
        describe: `Recreates Encryption Keys for '.env.*' files and encrypts them into a new vault\r\n`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            console.info(`Recreate Encryption Keys, Recreate Encryption Vault using new keys`);
            reCreateVault.run({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            console.info(`Done`);
        },
    })
    .command({
        command: `encrypt [dotEnvFilesDirectory]`,
        describe: `Encrypt Vault using encryption keys present in process.env | .env | .env.keys\r\n`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            console.info(`Encrypt Vault using encryption keys present in process.env | .env | .env.keys`);
            encryptVault.run({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            console.info(`Done`);
        },
    })
    .command({
        command: `decrypt [dotEnvFilesDirectory]`,
        describe: `Decrypt Vault using encryption keys present in process.env | .env | .env.keys\r\n`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            console.info(`Encrypt Vault using encryption keys present in process.env | .env | .env.keys`);
            decryptVault.run({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            console.info(`Done`);
        },
    })
    .command({
        command: `rotate-keys [dotEnvFilesDirectory]`,
        describe: `Rotate Encryption Keys.\r\n Encryption keys can be passed using process.env | .env | .env.keys.\r\n They will be dumped into .env.keys after rotation`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            console.info(`Rotate Encryption Keys`);
            rotateKeys.run({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            console.info(`Done`);
        },
    })
    .command({
        command: `print-env-vars [dotEnvFilesDirectory]`,
        describe: `Prints the environment variables in the current project\r\n`,
        builder: commonArgumentsBuilder,
        handler: (argv): void => {
            configure({ dotEnvFilesDirectory: argv.dotEnvFilesDirectory });
            console.log(process.env);
        },
    })
    .command({
        command: `generate-new-key`,
        describe: `Generates a new encryption key.\r\n The key can be used for encrypting a possible new environment.\r\n`,
        handler: (): void => {
            console.info(`Encryption Key:`);
            generateKey.run();
            console.info(`Done`);
        },
    })
    .wrap(120)
    .parse();
