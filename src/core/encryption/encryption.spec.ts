import { decryptData, encryptData, EncryptionDecryptionDetails } from './encryption';
import { describe, expect, test } from '@jest/globals';

describe('Encryption and Decryption', () => {
    const encryptionKey = 'your-encryption-key';
    const encryptionIV = 'your-encryption-iv';
    const testData = 'Hello, World!';

    test('should encrypt and decrypt data successfully', () => {
        const input: EncryptionDecryptionDetails = {
            encryptionKey,
            encryptionIV,
        };

        const encryptedData = encryptData({ ...input, data: testData });
        const decryptedData = decryptData({ ...input, data: encryptedData });

        expect(encryptedData).not.toBe(testData);
        expect(decryptedData).toBe(testData);
    });
});
