import * as process from 'process';
import * as yargs from 'yargs';
import { configure } from "../lib";
import { CommandLineUi, MenuOptions } from './cli-interface';
import * as createVault from './commands/create-vault.command';
import * as encryptVault from './commands/encrypt-vault.command';
import * as decryptVault from './commands/decrypt-vault.command';
import * as rotateKeys from './commands/rotate-keys.command';

const cli = new CommandLineUi();

const args = yargs.parseSync(process.argv);
const dotEnvFilesDirectory = (args.dotEnvFilesDirectory as string) || ``;

const run = async (): Promise<void> => {
    let selectedOption = MenuOptions.Exit;
    do {
        selectedOption = await cli.askForMenuOption();

        switch (selectedOption) {
            case MenuOptions.Create:
                createVault.run({ dotEnvFilesDirectory });
                cli.printSuccess();
                break;
            case MenuOptions.RotateKeys:
                rotateKeys.run({ dotEnvFilesDirectory });
                cli.printSuccess();
                break;
            case MenuOptions.EncryptEnvFiles:
                encryptVault.run({ dotEnvFilesDirectory });
                cli.printSuccess();
                break;
            case MenuOptions.PrintEnvVars:
                configure({ dotEnvFilesDirectory });
                console.log(process.env);
                cli.printSuccess();
                break;
            case MenuOptions.DecryptEnvFiles:
                decryptVault.run({ dotEnvFilesDirectory });
                cli.printSuccess();
                break;
        }
    } while (selectedOption !== MenuOptions.Exit);

    cli.printByeMessage();
    process.exit(0);
};

run().catch((e) => {
    console.error('GlobalErrorHandler', e);
    process.exit(1);
});

process.on('SIGINT', () => {
    cli.printByeMessage();
});
