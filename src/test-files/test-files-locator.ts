import * as path from 'node:path';

export const TestFilesLocator = {
    only_one_decryption_key: path.join(__dirname, '/only-one-decryption-key'),
    two_decryption_keys: path.join(__dirname, '/two-decryption-keys'),
    two_decryption_keys_with_env_name_specified: path.join(__dirname, '/two-decryption-keys-with-env-name-specified'),
    one_decryption_key_with_wrong_env_name_specified: path.join(__dirname, '/one-decryption-key-with-wrong-env-name-specified'),
    only_invalid_decryption_key: path.join(__dirname, '/only-invalid-decryption-key'),
} as const;
