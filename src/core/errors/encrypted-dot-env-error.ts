export enum EncryptedDotEnvErrorCodes {
    FAILED_TO_IDENTIFY_CURRENT_ENVIRONMENT_MULTIPLE_VAULT_KEYS = `CONFIGURE_FAILED_TO_IDENTIFY_CURRENT_ENVIRONMENT_MULTIPLE_VAULT_KEYS`,
    FAILED_TO_DECRYPT_ENVIRONMENT_MISSING_DECRYPTION = `CONFIGURE_FAILED_MISSING_DECRYPTION_KEY_FOR_CURRENT_ENVIRONMENT`,
    FAILED_TO_DECRYPT_ENVIRONMENT_INVALID_DECRYPTION_KEY = `CONFIGURE_FAILED_INVALID_DECRYPTION_KEY`,
    MISSING_DECRYPTION_KEY_FOR_ENVIRONMENT = `MISSING_DECRYPTION_KEY_FOR_ENVIRONMENT`,
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

        for (let key in props) {
            this[key] = props[key];
        }
    }
}

export const failWithEncryptedFotEnvError = (props: Props): never => {
    throw new EncryptedDotEnvError(props);
};
