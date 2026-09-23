/**
 * Checks if the given string consists only of numeric digit characters (0-9).
 *
 * @param value - The string to check.
 * @returns True if every character in the string is a digit and the string is non-empty; false otherwise.
 */
export const isAllDigits = (value: string): boolean => {
    if (value.length === 0) {
        return false;
    }
    for (const character of value) {
        if (character < "0" || character > "9") {
            return false;
        }
    }
    return true;
}

/**
 * Checks whether a string is a valid "YYYY-MM-DD" date format.
 *
 * @param value - The date string to validate.
 * @returns True if the string is formatted as "YYYY-MM-DD" and all parts are numeric; false otherwise.
 */
export const isActionDateValid = (value: string): boolean => {
    const dateParts: string[] = value.split("-");
    if (dateParts.length !== 3) {
        return false;
    }
    const [year, month, day]: string[] = dateParts;
    return (
        year.length === 4 &&
        month.length === 2 &&
        day.length === 2 &&
        isAllDigits(year) &&
        isAllDigits(month) &&
        isAllDigits(day)
    );
};
