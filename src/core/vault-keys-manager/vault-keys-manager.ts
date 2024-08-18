import * as passwordGenerator from 'generate-password';
import { pickBy } from 'lodash';
import { isNil, isString, mergeRecordsWithValues } from '../../utils';
import { EncryptionDecryptionDetails } from '../encryption/encryption';
import { EncryptedEnvLogger } from '../logger/encrypted-env-logger';
import { ENV_KEYS_FILE_NAME } from '../vault-file-system/consts';
import { mapDotEnvFileNameToEnvironmentName } from '../vault-file-system/map-dot-env-file-name-to-environment-name';
import { VaultFileSystem } from '../vault-file-system/vault-file-system';
import { decodeVaultKey, encodeVaultKey, VaultEncryptionKey } from './utils/encodeDecodeVaultKey';

const VAULT_DECRYPTION_KEY_PREFIX = `VAULT_KEY_`;

export type VaultKeys = Record<string, EncryptionDecryptionDetails | null>;

export class VaultKeysManager {
    private readonly vaultFileSystem: VaultFileSystem;
    private readonly logger: EncryptedEnvLogger;

    constructor({ vaultFileSystem, logger }: { vaultFileSystem: VaultFileSystem; logger: EncryptedEnvLogger }) {
        this.vaultFileSystem = vaultFileSystem;
        this.logger = logger;
    }

    // Keys are passed in query params encoded format. Basically you have the following example
    // encryptionIV = 'houzyDev'
    // encryptionKey = 'houzyRocks2021'
    // and the .env file has the name .env.local
    // then in .env.keys you should have some this
    // VAULT_KEY_LOCAL=`{encodeURI(`encryptionIV=houzyDev&encryptionKey=houzyRocks2021`)}`
    public readEncryptionKeys(): VaultKeys {
        const filterEncryptionKeysFromEnvVars = (envVars: Record<string, string | undefined>): Record<string, string> => {
            return pickBy(envVars, (value, key) => key.startsWith(VAULT_DECRYPTION_KEY_PREFIX) && isString(value) && value.length > 0) as Record<
                string,
                string
            >;
        };

        let encryptionDecryptionKeys = filterEncryptionKeysFromEnvVars(
            mergeRecordsWithValues([this.vaultFileSystem.getEnvVarsFromSystem(), this.vaultFileSystem.parseEnvVarsFromFile(ENV_KEYS_FILE_NAME)]),
        );

        const vaultKeys: VaultKeys = {};

        for (const vaultKeyName in encryptionDecryptionKeys) {
            const environmentName = vaultKeyName.replace(VAULT_DECRYPTION_KEY_PREFIX, '');
            const keyDetails = decodeVaultKey(encryptionDecryptionKeys[vaultKeyName]);
            if (isNil(keyDetails)) {
                continue;
            }

            vaultKeys[environmentName] = keyDetails;
        }

        return vaultKeys;
    }

    public reCreate(): void {
        this.vaultFileSystem.rmSync(ENV_KEYS_FILE_NAME);
        const encryptionKeys = this.createKeysForDotEnvFiles();
        this.saveEncryptionKeys(encryptionKeys);
    }

    public createKeysForMissingDotEnvFiles(): void {
        const currentEncryptionKeys = this.readEncryptionKeys();

        const dotEnvFilesPath = this.vaultFileSystem.findDotEnvFiles();

        for (const { fileName } of dotEnvFilesPath) {
            const environmentName = mapDotEnvFileNameToEnvironmentName(fileName);
            if (environmentName?.length && !currentEncryptionKeys[environmentName]) {
                currentEncryptionKeys[environmentName] = this.createEncryptionKey();
            }
        }

        this.saveEncryptionKeys(currentEncryptionKeys);
    }

    private readonly encryptionKeyGeneratorOptions = {
        length: 128,
        numbers: true,
        uppercase: true,
        symbols: true,
        lowercase: true,
        excludeSimilarCharacters: true,
        strict: true,
    };

    private createEncryptionKey(): VaultEncryptionKey {
        return {
            encryptionKey: passwordGenerator.generate(this.encryptionKeyGeneratorOptions),
            encryptionIV: passwordGenerator.generate(this.encryptionKeyGeneratorOptions),
        };
    }

    private createKeysForDotEnvFiles(): VaultKeys {
        const dotEnvFilesPath = this.vaultFileSystem.findDotEnvFiles();

        const envVaultKeys: VaultKeys = {};
        for (const { fileName } of dotEnvFilesPath) {
            const environmentName = mapDotEnvFileNameToEnvironmentName(fileName);
            if (environmentName?.length) {
                envVaultKeys[environmentName] = this.createEncryptionKey();
            }
        }

        return envVaultKeys;
    }

    private saveEncryptionKeys(vaultKeys: VaultKeys): void {
        const vaultKeysList: string[] = [];
        for (const [environmentName, vaultKey] of Object.entries(vaultKeys)) {
            if (!isNil(vaultKey)) {
                vaultKeysList.push(`${VAULT_DECRYPTION_KEY_PREFIX}${environmentName}=${encodeVaultKey(vaultKey)}`);
            }
        }
        this.vaultFileSystem.writeFile({ fileName: ENV_KEYS_FILE_NAME, content: vaultKeysList });
    }
}
