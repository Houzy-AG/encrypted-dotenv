// We expect the vault keys to be encoded uri params because we do not want to invent our own encoding for them and we do not want to
// restrict specific characters.
import { convertToUrl, isNil, isString } from '../../../utils';

export interface VaultEncryptionKey {
    encryptionIV: string;
    encryptionKey: string;
}

export const decodeVaultKey = (vaultKey: string | undefined): VaultEncryptionKey | null => {
    if (isNil(vaultKey)) {
        return null;
    }
    const keyDetails = convertToUrl(`https://env-keys.decription?${decodeURI(vaultKey)}`);
    const encryptionIV = keyDetails?.searchParams.get('encryptionIV');
    const encryptionKey = keyDetails?.searchParams.get('encryptionKey');

    if (!isString(encryptionIV) || !encryptionIV.length || !isString(encryptionKey) || !encryptionKey.length) {
        return null;
    }
    return { encryptionIV, encryptionKey };
};

export const encodeVaultKey = (data: VaultEncryptionKey): string => {
    // In this case we type force because we know 100% that this url is valid.
    const keyAsUrl = convertToUrl(`https://env-keys.decription`) as unknown as URL;
    keyAsUrl.searchParams.set('encryptionIV', data.encryptionIV);
    keyAsUrl.searchParams.set('encryptionKey', data.encryptionKey);
    return `${encodeURI(keyAsUrl.search.substring(1, keyAsUrl.search.length))}`;
};
