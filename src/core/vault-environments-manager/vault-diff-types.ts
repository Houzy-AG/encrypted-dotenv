import { DecryptedVault, DecryptedVaultInfo } from './vault-types';

export type VaultDiff =
    | {
          type: 'environment-diff';
          environmentName: string;
          fileName: string;
          vaultInfo: DecryptedVaultInfo;
      }
    | {
          type: 'env-var-diff';
          environmentName: string;
          envVarName: string;
          left: { fileName: string; value: string };
          right: { fileName: string; value: string };
      };

export interface VaultDifferenceOverview {
    mainVault: DecryptedVault;
    diffs: VaultDiff[];
}

export enum EnvironmentDiffOption {
    Keep = 'Keep',
    Discard = 'Discard',
}

export enum EnvVarDiffOption {
    RemoteValue = 'RemoteValue',
    LocalValue = 'LocalValue',
    Discard = 'Discard',
}
