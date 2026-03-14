/**
 * Normalizes a name or sentence by capitalizing the first letter of each word
 * and making the rest lowercase. Also removes extra spaces.
 * 
 * @param text The string to normalize
 * @returns The normalized string (e.g., "aBHisHek AdhiKari" -> "Abhishek Adhikari")
 */
export const normalizeName = (text: string): string => {
    if (!text) return '';
    
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Extracts the initials from a given name or sentence.
 * 
 * @param text The string to extract initials from
 * @returns The initials in uppercase (e.g., "Abhishek Adhikari" -> "AA")
 */
export const getInitials = (text: string): string => {
    if (!text) return '';

    return text
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('');
};
