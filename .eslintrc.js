module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint/eslint-plugin', 'import', 'import-path', 'unused-imports'],
    extends: ['plugin:@typescript-eslint/eslint-recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    ignorePatterns: ['**/seed-data/generated/*.ts', '**/data-access/migrations/*.ts'],
    rules: {
        'prefer-const': 'warn',
        'import/no-duplicates': 'error',
        'import/no-absolute-path': 'error',
        '@typescript-eslint/naming-convention': [
            'warn',
            {
                selector: 'enumMember',
                format: ['PascalCase'],
            },
        ],
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-empty-function': 'warn',
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                varsIgnorePattern: '^_',
                argsIgnorePattern: '^_',
            },
        ],
        '@typescript-eslint/no-inferrable-types': [
            'warn',
            {
                // We don't ignore function parameters for inferable types because in this case it doesn't affect us.
                ignoreParameters: false,
                // We ignore inferable types for properties because typeorm relies on the explicit types for columns in order to deduce the database schema
                // if eslint removes the inferred types for .entity.ts the orm will crash.
                ignoreProperties: true,
            },
        ],
        '@typescript-eslint/explicit-module-boundary-types': 'warn',
        'unused-imports/no-unused-imports': 'error',
    },
};
