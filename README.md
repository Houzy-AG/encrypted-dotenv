# encrypted-dotenv

This package encrypts the environment variables so that you can ship the with your code and you can manage
them in your local repository. Is based on the idea proposed by [dot-env-vault](https://github.com/dotenv-org/dotenv-vault) but was designed
for local usage only

### Cli tool features

As a cli you can use it with commands see `npx encrypted-dotenv --help`. Or you can lunch the interactive cli app using `npx encrypted-dotenv-interactive`

-   `Recreate Vault`:
    -   Takes all `.env.*` file contents and encrypts them into a single file called `.env-vault.json`.
    -   It also dumps the encryption keys used to encrypt every env file into `.env.keys` - do not commit your keys in the repository
-   `Rotate Vault Keys`:
    -   Decrypts your `.env-vault.json` using `.env.keys` after that it generates a new set of keys for every file and encrypts the vault back. It also dumps the new keys in `.env.keys`
    -   This command is safe to use even if you miss some keys for your vault because if we couldn't decrypt your vault file because of various reasons we do not override the content of that file in the new `.env-vault.json`
-   `Encrypt Env Files`:
    -   Takes your local `.env.*` files and encrypts them using the keys in `.env.keys`
    -   This command will not override the content of `.env.production` or any other `.env.file` if you don't have the file and the decryption key locally
-   `Decrypt Env Files`:
    -   It takes the `.env-vault.json` and `.env.keys` files and generates the original files used to create the vault
    -   For example if we had `.env.local` and `.env.production` + the keys to encrypt them we will reverse the process back from the vault
-   `Print environment variables`
    -   It parses the current environment end prints what will process.env contain
-   `Generate Key`
    -   Generates a new encryption key which can be used to add a new environment.
    -   When you already have a vault, and you want to add a new environment you can generate a new key, create a new variable with the key for your new `.env.*` and then you can use `Encrypt Env Files` to add the new environment to the vault

### Install the package

```bash
npm install encrypted-dotenv --save
```

### Options to use the package in your project

1. Start your project with the `node -r encrypted-dotenv/configure your_script.js` The script will populate `process.env` with the correct env vars
2. Start your project with the `node -r encrypted-dotenv/configure your_script.js --dot-env-files-directory=file/test` Is the same as above but you can change the directory which contains `.env` files

3. Import the library and call configure manually

```
import * as encryptedEnv from 'encrypted-dotenv';
// This will look in process.cwd() for `.env.*` files
encryptedEnv.configure();
// Or optionally if your `.env.*` files and in another folder you can use
encryptedEnv.configure({ dotEnvFilesDirectory: `path to your directory with .env.* files it has to be relative to process.cwd()` });
```

### Vault structure and logic
The `.env.keys` file contains variables which define the encryption/decryption keys for different environments
```yaml
VAULT_KEY_LOCAL=encryptionIV=m%252Fb%253Bp%257Dv-%257E%253CZ4%2521%253FwPaB.B%2522%2528%253A%2528Wy%257BCh%253AQ%2528%257EYYZ%257B%252Fe%255E2_%2521UyCmR%253A*nWEmzC%255B%257D1T7E%257BF%253D8MZ%2522%253E8TK%2528ggb%2521%255B%253APC%257B%252C%252CcmuZEBnPEjsVgFsgC*8T%253EA%2525P%253AAt8zKu%253A_N%252Cg%2523%255DGWeE%257D&encryptionKey=%253Er%2540P%253CRK_T6zd5Y*hq%2529C%255B%2523jw3%2523Kbqe7%253CbMqh%253D%257D%253F%255D%253AgMw%2540pUKPDpGpR%255DvM%257De%2522T%252CxbSSX%2524_sUf_3W%253EC%253A%2529q7%253FHNW%253BX%253A2f%252Cz%25233w5qG4k%255BkX%253AykV_2e%257Eb%253B%253Ac%2523q%253EymR%253E.Ja%252FT.A
VAULT_KEY_DEVELOPMENT=encryptionIV=m%252Fb%253Bp%257Dv-%257E%253CZ4%2521%253FwPaB.B%2522%2528%253A%2528Wy%257BCh%253AQ%2528%257EYYZ%257B%252Fe%255E2_%2521UyCmR%253A*nWEmzC%255B%257D1T7E%257BF%253D8MZ%2522%253E8TK%2528ggb%2521%255B%253APC%257B%252C%252CcmuZEBnPEjsVgFsgC*8T%253EA%2525P%253AAt8zKu%253A_N%252Cg%2523%255DGWeE%257D&encryptionKey=%253Er%2540P%253CRK_T6zd5Y*hq%2529C%255B%2523jw3%2523Kbqe7%253CbMqh%253D%257D%253F%255D%253AgMw%2540pUKPDpGpR%255DvM%257De%2522T%252CxbSSX%2524_sUf_3W%253EC%253A%2529q7%253FHNW%253BX%253A2f%252Cz%25233w5qG4k%255BkX%253AykV_2e%257Eb%253B%253Ac%2523q%253EymR%253E.Ja%252FT.A
VAULT_KEY_STAGING=encryptionIV=m%252Fb%253Bp%257Dv-%257E%253CZ4%2521%253FwPaB.B%2522%2528%253A%2528Wy%257BCh%253AQ%2528%257EYYZ%257B%252Fe%255E2_%2521UyCmR%253A*nWEmzC%255B%257D1T7E%257BF%253D8MZ%2522%253E8TK%2528ggb%2521%255B%253APC%257B%252C%252CcmuZEBnPEjsVgFsgC*8T%253EA%2525P%253AAt8zKu%253A_N%252Cg%2523%255DGWeE%257D&encryptionKey=%253Er%2540P%253CRK_T6zd5Y*hq%2529C%255B%2523jw3%2523Kbqe7%253CbMqh%253D%257D%253F%255D%253AgMw%2540pUKPDpGpR%255DvM%257De%2522T%252CxbSSX%2524_sUf_3W%253EC%253A%2529q7%253FHNW%253BX%253A2f%252Cz%25233w5qG4k%255BkX%253AykV_2e%257Eb%253B%253Ac%2523q%253EymR%253E.Ja%252FT.A
```
The naming of the environment variables is `VAULT_KEY_{{ENVIRONMENT_NAME_IN_UPPERCASE}}`.
The `.env-vault.json` file contains separated entries for all your environments. Vault example:

```json
{
    "LOCAL": "MmMzOTQ2ZDNhZWQwOGMzYmE4NTI3YWEwZmRhY2JiMDY=",
    "DEVELOPMENT": "MmMzOTQ2ZDNhZWQwOGMzYmE4NTI3YWEwZmRhY2JiMDY=",
    "STAGING": "MmMzOTQ2ZDNhZWQwOGMzYmE4NTI3YWEwZmRhY2JiMDY="
}
```
Every key value pair represents one environment and his corresponding environment variables.
To specify which environment from the vault to use you have the following options:

1. Make sure your only pass one decryption key as environment variables, if the vault has only one key it will assume your environment is the environment encrypted with that key. The encryption key var name should be `VAULT_KEY_{{ENVIRONMENT_NAME_IN_UPPERCASE}}`. Options to pass the decryption key:
    1. Pass the decryption key using `process.env`.
    2. Pass the decryption key using a file named `.env`
    3. Pass the decryption key using a `.env.keys` file
2. If you pass multiple decryption keys you have to specify which one represents the current environment. You can do that by specifying the environment variable `ENVIRONMENT={{environmentName}}`. You can pass the variable using the following options:
    1. Pass the variable using `process.env`
    2. Pass the variable using a file named `.env`

Apps can get environment variables also using `process.env` and `process.env` will take precedence over the vault. 
We let `process.env` to take precedence over the vault for various reasons like an api key which was changed, and we want to change it without redeploying the app. 
When `encryptedEnv.configure()` is called have the following logic to determine which environment variables takes precedence.
1. `process.env` 
   1. Has the highest precedence, so if an env var is directly passed in `process.env` it will not be overridden from any other sources.
2. `.env` 
   1. We try to look if you have `.env` and if it exists we copy the env variables to `process.env` we take only the variables which do not have values in `process.env` 
   2. We consider `.env` without extension special and more important than what it is in the vault because on local environments can make variable overrides easier.
3. `.env-vault.json` 
   1. If we have decrypted an environment from the vault we copy the env variables to `process.env` we take only the variables which do not have values in `process.env`
4. After `encryptedEnv.configure()` is called we apply the logic described above, `process.env` will contain all the environment variables

**IMPORTANT !!!** We consider that an environment variable doesn't exist if it was not passed or it's values is `null | undefined | ''`

### This package is meant to simplify environment variables usage.

Basically for every environment we encrypt everything in the `.env-vault.json` and we can safely commit it to the code base as long as we keep the keys hidden.
When you deploy you copy the `.env-vault.json` and define the decryption key for that environment in that machine.
We handle the `.env` specially because we use it as a way to override what's inside the vault. 
You can still pass variables directly in `process.env` to override what we have on the vault but if you have a lot of env vars `.env` file would be a nice way to override them.

