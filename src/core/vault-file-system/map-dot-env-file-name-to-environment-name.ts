export const mapDotEnvFileNameToEnvironmentName = (fileName: string): string | null => {
    if (!fileName.startsWith('.env.')) {
        return null;
    }

    return fileName.replace('.env.', '').toUpperCase();
};
