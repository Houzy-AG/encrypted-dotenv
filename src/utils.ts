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

export const mergeRecords = (recordsList: Record<string, string>[]): Record<string, string> => {
    const out: Record<string, string> = {};

    for (const record of recordsList) {
        for (const recordKey in record) {
            if (isNil(out[recordKey]) || (typeof out[recordKey] === 'string' && !out[recordKey].length)) {
                out[recordKey] = record[recordKey];
            }
        }
    }
    return out;
};
