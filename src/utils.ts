import { isString } from 'lodash';

export const isNil = (value: unknown): boolean => value === null || value === undefined;

export const convertToUrl = (url: string): URL | null => {
    if (isNil(url)) {
        return null;
    }
    try {
        return new URL(url);
    } catch (_) {
        return null;
    }
};

// Merges all the records into one from left to right. If some values are defined multiple times we override them if they are
// `null | undefined | ''`.
export const mergeRecordsWithValues = (recordsList: Record<string, string | undefined>[]): Record<string, string | undefined> => {
    const out: Record<string, string | undefined> = {};

    for (const record of recordsList) {
        for (const recordKey in record) {
            const recordValue = out[recordKey];
            if (isNil(recordValue) || (isString(recordValue) && !recordValue.length)) {
                out[recordKey] = recordValue;
            }
        }
    }
    return out;
};
