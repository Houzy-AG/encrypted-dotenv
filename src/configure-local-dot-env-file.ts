import * as process from 'process';
import * as yargs from 'yargs';
import { defaultLogger } from './core/logger/encrypted-env-logger';
import { configureLocalDotEnvFile } from './core/configure-local-dot-env-file';

const args = yargs.parseSync(process.argv);
const dotEnvFilesDirectory = (args.dotEnvFilesDirectory as string) || ``;

configureLocalDotEnvFile({ dotEnvFilesDirectory, logger: defaultLogger });
