export enum EncryptedDotEnvErrorCodes {
    FailedToIdentifyActiveEnvironment = `FAILED_TO_IDENTIFY_ACTIVE_ENVIRONMENT`,
    FailedToIdentifyDecryptionKeyForActiveEnvironment = `FAILED_TO_IDENTIFY_DECRYPTION_KEY_FOR_ACTIVE_ENVIRONMENT`,
    FailedToIdentifyDecryptEnvironmentInvalidDecryptionKey = `FAILED_TO_DECRYPT_ENVIRONMENT_INVALID_DECRYPTION_KEY`,
    MissingDecryptionKeyForEnvironment = `MISSING_DECRYPTION_KEY_FOR_ENVIRONMENT`,
}

type Props = { message: string; cause?: Error; errorCode: string } & Record<string, unknown>;

export class EncryptedDotEnvError extends Error implements Props {
    [x: string]: unknown;
    cause?: Error | undefined;
    errorCode: string;

    constructor(props: Props) {
        super(props.message);
        this.name = `EncryptedDotEnvError`;
        this.errorCode = props.errorCode;

        for (const key in props) {
            this[key] = props[key];
        }
    }
}

export const failWithEncryptedFotEnvError = (props: Props): never => {
    throw new EncryptedDotEnvError(props);
};
