import { isNil } from 'lodash';

export const convertToString = (value: unknown): string => {
    if (isNil(value)) {
        return ``;
    }

    return `${value}`;
};
