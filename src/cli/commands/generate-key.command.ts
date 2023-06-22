import { encodeVaultKey, generateKey } from '../../core/vault-keys';

export const run = (): void => {
    const newKeys = generateKey();
    console.log(encodeVaultKey(newKeys));
};
