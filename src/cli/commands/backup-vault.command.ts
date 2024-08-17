import { DefaultArguments } from '../../core/globals/default-arguments';
import { backupVault } from '../../core/vault';

export const run = (options: DefaultArguments): void => {
    backupVault(options);
};
