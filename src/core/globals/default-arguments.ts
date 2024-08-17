import { EncryptedEnvLogger } from '../logger/encrypted-env-logger';

export interface DefaultArguments {
    dotEnvFilesDirectory?: string;
    logger: EncryptedEnvLogger;
}
