# encrypted-dotenv


This package encrypts the environment variables so that you can ship the with your code and you can manage
them in your local repository.

### Cli tool features

- `Create Vault`: 
  - Takes all `.env.*` file contents and encrypts them into a single file called `.env-vault.json`.
  - It also dumps the encryption keys used to encrypt every env file into `.env.keys` - Do not commit your keys in the repository
- `Rotate Vault Keys`: 
  - Decrypts your `.env-vault.json` using `.env.keys` generates a new set of keys for every file and encrypts the vault back also dumps the new keys in `.env.keys`
  - This command is safe to use even if you miss some keys for your vault because if we couldn't decrypt your vault file because of various reasons we do not override the content of that file in the new `.env-vault.json`
- `Encrypt Env Files`:
  - Takes your local `.env.*` files and encrypts them using the keys in `.env.keys`
  - This command will not override the content of `.env.production` or any other `.env.file` if you don't have the file and the decryption key locally 
- `Decrypt Env Files`:
  - It takes the `.env-vault.json` and `.env.keys` files and generates the original files used to create the vault
  - For example if we had `.env.local` and `.env.production` + the keys to encrypt them we will reverse the process back from the vault


### Npm package features
- Install the package
```
npm install encrypted-dotenv --save
```

- Options to use the package in your project.
  1. Start your project with the `node -r encrypted-dotenv/configure your_script.js` The script will populate process.env with the correct env vars
  2. Start your project with the `node -r 'encrypted-dotenv/configure' your_script.js --dot-env-files-directory=file/test` Is the same as above but you can change the directory which contains .env files

  3. Import the library and call configure manually 
  ``` 
  import * as encryptedEnv from 'encrypted-dotenv';
  // This will look in process.cwd() for `.env.*` files
  encryptedEnv.configure(); 
  // Or optionally if your `.env.*` files and in another folder you can use
  encryptedEnv.configure({ dotEnvFilesDirectory: `path to your directory with .env.* files it has to be relative to process.cwd()` });
  ```

- How does the package figure out which `.env.environmentName` to use from `.env-vault.json`
- Variables precedence
  1. `process.env` => Has the highest precedence, so if an env var is directly passed in `process.env` it will not be overridden
  2. `.env` => We try to look if you have `.env` file because we consider `.env` without extension special and more important than what it is in the vault. This also helps to have some variables locally which are not commited to the repo
  3. `.env-vault.json` => We try to look if the `.env-vault.json` exists and if the vault exists we decrypt it and we merge the variables
- When you call `encryptedEnv.configure()` all variables will be available in `process.env` at the end of the process
- If your `.env-vault.json` contains more than one environment for example you have `.env.development`, `.env.staging` and `.env.production` inside it. When we merge
the `.env-vault.json` to `process.env` we use only one of the environments present, and we pick the environment in the following way
  1. If you have only the decryption key for one of the environments we will use that environment. The decryption key can be set in `process.env` or in `.env` or in `.env.keys` (Note!: The same precedence as before takes place)
  2. If you have multiple keys set then we expect you to pass an environment variable called `ENVIRONMENT=envName` in `process.env` or in `.env` and we will basically use the encryption key for that environment
  3. Encryption keys have the following format `ENVIRONMENT_VARIABLE_VOLT_KEY_LOCAL=encryptionIV=testIV&encryptionKey=testKey`
