// It looks something like this
// {
//      DEVELOPMENT: <encrypted string>
//      PRODUCTION: <encrypted string>,
//      ...
//  }
export type DecodedVault = Record<string, string>;

// It looks something like this
// {
//     LOCAL: {
//          envName: 'LOCAL',
//          decrypted: true,
//          data: DecodedVault
//          encryptedStringContent: // The content of the vault .env file encrypted
//          decryptedStringContent: // The content of the vault .env file decrypted only present if decrypted is true
//     }
// }
export type DecryptedVault = Record<
    string,
    {
        environmentName: string;
        decrypted: boolean;
        decryptedStringContent: string;
        encryptedStringContent: string;
        data: null | DecodedVault;
    }
>;

export const mapDecryptedVaultToDecodedVault = (vault: DecryptedVault): DecodedVault => {
    return Object.values(vault).reduce((acc, { environmentName, encryptedStringContent }) => {
        acc[environmentName] = encryptedStringContent;
        return acc;
    }, {});
};
