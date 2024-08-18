import fs, { readFileSync } from 'node:fs';
import { TestFilesLocator } from '../../test-files/test-files-locator';

export const expectFileToContain = (
    filePath: string,
    content: string,
    done: { fail: (error?: string | { message: string }) => unknown },
): boolean => {
    if (!fs.existsSync(filePath)) {
        done.fail(`Failed to write : "${TestFilesLocator.tests_fs_directory_location}/.env.dev" `);
        return false;
    }
    expect(readFileSync(filePath).toString()).toEqual(content);
    return true;
};
