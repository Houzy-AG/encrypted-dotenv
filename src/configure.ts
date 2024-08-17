import * as process from 'process';
import * as yargs from 'yargs';
import { defaultLogger } from './core/logger/encrypted-env-logger';
import { configure } from './lib';

const args = yargs.parseSync(process.argv);
const dotEnvFilesDirectory = (args.dotEnvFilesDirectory as string) || ``;

configure({ dotEnvFilesDirectory, logger: defaultLogger });
