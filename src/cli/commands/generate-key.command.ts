import { DefaultArguments } from '../../core/globals/default-arguments';
import { encodeVaultKey, generateKey } from '../../core/vault-keys';

export const run = ({ logger }: Pick<DefaultArguments, 'logger'>): void => {
    const newKeys = generateKey();
    logger.log(encodeVaultKey(newKeys));
};
