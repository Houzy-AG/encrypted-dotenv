import { createCipheriv, createDecipheriv, createHash } from 'crypto';

export interface EncryptionDecryptionDetails {
    encryptionKey: string;
    encryptionIV: string;
}

interface EncryptDecryptInput extends EncryptionDecryptionDetails {
    data: string;
}

const getKeyAndIv = (encryptionKey: string, encryptionIV: string): { encryptionKeySha: string; encryptionIVSha: string } => ({
    // We use sha512 and substring because encryptionKey / encryptionIV have specific lengths, and we basically want to let the user pass
    // any random string as encryptionKey / encryptionIV without trying to find the perfect length for them.
    encryptionKeySha: createHash('sha512').update(encryptionKey).digest('hex').substring(0, 32),
    encryptionIVSha: createHash('sha512').update(encryptionIV).digest('hex').substring(0, 16),
});

export const decryptData = ({ data, encryptionKey, encryptionIV }: EncryptDecryptInput): string => {
    const { encryptionKeySha, encryptionIVSha } = getKeyAndIv(encryptionKey, encryptionIV);
    const decipher = createDecipheriv('aes-256-cbc', encryptionKeySha, encryptionIVSha);
    return decipher.update(Buffer.from(data, 'base64').toString('utf8'), 'hex', 'utf8') + decipher.final('utf8');
};

export const encryptData = ({ data, encryptionKey, encryptionIV }: EncryptDecryptInput): string => {
    const { encryptionKeySha, encryptionIVSha } = getKeyAndIv(encryptionKey, encryptionIV);
    const cipher = createCipheriv('aes-256-cbc', encryptionKeySha, encryptionIVSha);
    return Buffer.from(cipher.update(data, 'utf8', 'hex') + cipher.final('hex')).toString('base64');
};
