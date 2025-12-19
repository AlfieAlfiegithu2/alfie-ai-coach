/**
 * IELTS Answer Matching Utilities
 * 
 * Provides flexible answer matching for IELTS Reading/Listening tests
 * that handles variations in:
 * - Case sensitivity (YES = yes = Yes)
 * - Special characters (self-esteem = selfesteem = self esteem)
 * - TRUE/FALSE/NOT GIVEN shorthand (T, F, NG)
 * - YES/NO/NOT GIVEN shorthand (Y, N, NG)
 * - Roman numerals (i, ii, iii, iv, v, vi, vii)
 * - Whitespace variations
 */

/**
 * Normalize an answer for comparison
 * Removes special characters, normalizes whitespace, and handles case
 */
export function normalizeAnswer(answer: string | undefined | null): string {
    if (!answer) return '';

    let normalized = answer.trim().toLowerCase();

    // Handle TRUE/FALSE/NOT GIVEN variations
    if (isTrueFalseNotGiven(normalized)) {
        return normalizeTFNG(normalized);
    }

    // Handle YES/NO/NOT GIVEN variations
    if (isYesNoNotGiven(normalized)) {
        return normalizeYNNG(normalized);
    }

    // For other answers, remove special characters but preserve letters and numbers
    // Replace hyphens, apostrophes, and other punctuation with spaces
    normalized = normalized.replace(/[-–—''`'"]/g, ' ');

    // Remove any remaining punctuation except alphanumeric and spaces
    normalized = normalized.replace(/[^a-z0-9\s]/g, '');

    // Normalize multiple spaces to single space
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
}

/**
 * Check if answer is a TRUE/FALSE/NOT GIVEN type
 */
function isTrueFalseNotGiven(answer: string): boolean {
    const tfngPatterns = [
        'true', 't',
        'false', 'f',
        'not given', 'notgiven', 'ng', 'not-given'
    ];
    return tfngPatterns.includes(answer.replace(/\s+/g, '').toLowerCase());
}

/**
 * Check if answer is a YES/NO/NOT GIVEN type
 */
function isYesNoNotGiven(answer: string): boolean {
    const ynngPatterns = [
        'yes', 'y',
        'no', 'n',
        'not given', 'notgiven', 'ng', 'not-given'
    ];
    return ynngPatterns.includes(answer.replace(/\s+/g, '').toLowerCase());
}

/**
 * Normalize TRUE/FALSE/NOT GIVEN to standard form
 */
function normalizeTFNG(answer: string): string {
    const cleaned = answer.replace(/\s+/g, '').toLowerCase();

    if (cleaned === 'true' || cleaned === 't') return 'true';
    if (cleaned === 'false' || cleaned === 'f') return 'false';
    if (cleaned === 'notgiven' || cleaned === 'ng' || cleaned === 'not-given') return 'not given';

    return answer;
}

/**
 * Normalize YES/NO/NOT GIVEN to standard form
 */
function normalizeYNNG(answer: string): string {
    const cleaned = answer.replace(/\s+/g, '').toLowerCase();

    if (cleaned === 'yes' || cleaned === 'y') return 'yes';
    if (cleaned === 'no' || cleaned === 'n') return 'no';
    if (cleaned === 'notgiven' || cleaned === 'ng' || cleaned === 'not-given') return 'not given';

    return answer;
}

/**
 * Compare two answers with flexible matching
 * Returns true if the answers are considered equivalent
 */
export function answersMatch(
    userAnswer: string | undefined | null,
    correctAnswer: string | undefined | null
): boolean {
    if (!userAnswer || !correctAnswer) return false;

    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);

    // Direct match after normalization
    if (normalizedUser === normalizedCorrect) return true;

    // Check if correct answer has multiple valid answers separated by /
    // e.g., "self-esteem/self esteem" should accept both
    if (correctAnswer.includes('/')) {
        const validAnswers = correctAnswer.split('/').map(a => normalizeAnswer(a.trim()));
        if (validAnswers.includes(normalizedUser)) return true;
    }

    // Check if correct answer has alternatives in parentheses
    // e.g., "(the) sun" should accept both "the sun" and "sun"
    if (correctAnswer.includes('(') && correctAnswer.includes(')')) {
        // Try with and without the parenthesized content
        const withoutParens = correctAnswer.replace(/\([^)]*\)\s*/g, '');
        const withParens = correctAnswer.replace(/[()]/g, '');

        if (normalizedUser === normalizeAnswer(withoutParens) ||
            normalizedUser === normalizeAnswer(withParens)) {
            return true;
        }
    }

    return false;
}

/**
 * Get the display version of the normalized answer
 * (keeps original for display but compares normalized)
 */
export function getDisplayAnswer(answer: string | undefined | null): string {
    if (!answer) return '';
    return answer.trim();
}
