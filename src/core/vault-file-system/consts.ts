export const GENERAL_DOT_ENV_FILE_NAME = `.env`;
export const ENV_KEYS_FILE_NAME = `.env.keys`;
export const ENV_VAULT_FILE_NAME = `.env-vault.json`;
export const ENV_VAULT_BACKUP_FILE_NAME = `.env-vault-backup.json`;

export type PossibleVaultFileNames = typeof ENV_VAULT_FILE_NAME | typeof ENV_VAULT_BACKUP_FILE_NAME;
