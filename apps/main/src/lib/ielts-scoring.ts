/**
 * Official IELTS Band Score Conversion Functions
 * These functions implement the exact official conversion logic from
 * number of correct answers (out of 40) to IELTS Band Scores.
 */

/**
 * IELTS Listening Band Score Conversion (Academic and General Training)
 * @param correctAnswers Number of correct answers out of 40
 * @returns IELTS Band Score (0-9)
 */
export const getListeningBandScore = (correctAnswers: number): number => {
  if (correctAnswers >= 39) return 9.0;
  if (correctAnswers >= 37) return 8.5;
  if (correctAnswers >= 35) return 8.0;
  if (correctAnswers >= 32) return 7.5;
  if (correctAnswers >= 30) return 7.0;
  if (correctAnswers >= 26) return 6.5;
  if (correctAnswers >= 23) return 6.0;
  if (correctAnswers >= 18) return 5.5;
  if (correctAnswers >= 16) return 5.0;
  if (correctAnswers >= 13) return 4.5;
  if (correctAnswers >= 10) return 4.0;
  if (correctAnswers >= 8) return 3.5;
  if (correctAnswers >= 6) return 3.0;
  if (correctAnswers >= 4) return 2.5;
  if (correctAnswers >= 2) return 2.0;
  if (correctAnswers >= 1) return 1.0;
  return 0.0;
};

/**
 * IELTS Academic Reading Band Score Conversion
 * @param correctAnswers Number of correct answers out of 40
 * @returns IELTS Band Score (0-9)
 */
export const getAcademicReadingBandScore = (correctAnswers: number): number => {
  if (correctAnswers >= 39) return 9.0;
  if (correctAnswers >= 37) return 8.5;
  if (correctAnswers >= 35) return 8.0;
  if (correctAnswers >= 33) return 7.5;
  if (correctAnswers >= 30) return 7.0;
  if (correctAnswers >= 27) return 6.5;
  if (correctAnswers >= 23) return 6.0;
  if (correctAnswers >= 19) return 5.5;
  if (correctAnswers >= 15) return 5.0;
  if (correctAnswers >= 13) return 4.5;
  if (correctAnswers >= 10) return 4.0;
  if (correctAnswers >= 8) return 3.5;
  if (correctAnswers >= 6) return 3.0;
  if (correctAnswers >= 4) return 2.5;
  if (correctAnswers >= 2) return 2.0;
  if (correctAnswers >= 1) return 1.0;
  return 0.0;
};

/**
 * IELTS General Training Reading Band Score Conversion
 * @param correctAnswers Number of correct answers out of 40
 * @returns IELTS Band Score (0-9)
 */
export const getGeneralReadingBandScore = (correctAnswers: number): number => {
  if (correctAnswers >= 40) return 9.0;
  if (correctAnswers >= 39) return 8.5;
  if (correctAnswers >= 37) return 8.0;
  if (correctAnswers >= 36) return 7.5;
  if (correctAnswers >= 34) return 7.0;
  if (correctAnswers >= 32) return 6.5;
  if (correctAnswers >= 30) return 6.0;
  if (correctAnswers >= 27) return 5.5;
  if (correctAnswers >= 23) return 5.0;
  if (correctAnswers >= 19) return 4.5;
  if (correctAnswers >= 15) return 4.0;
  if (correctAnswers >= 12) return 3.5;
  if (correctAnswers >= 9) return 3.0;
  if (correctAnswers >= 6) return 2.5;
  if (correctAnswers >= 4) return 2.0;
  if (correctAnswers >= 2) return 1.5;
  if (correctAnswers >= 1) return 1.0;
  return 0.0;
};

/**
 * Get the appropriate band score based on test type
 * @param correctAnswers Number of correct answers
 * @param testType Type of test ('listening', 'academic-reading', 'general-reading')
 * @returns IELTS Band Score (0-9)
 */
export const getBandScore = (
  correctAnswers: number,
  testType: 'listening' | 'academic-reading' | 'general-reading' = 'academic-reading'
): number => {
  switch (testType) {
    case 'listening':
      return getListeningBandScore(correctAnswers);
    case 'academic-reading':
      return getAcademicReadingBandScore(correctAnswers);
    case 'general-reading':
      return getGeneralReadingBandScore(correctAnswers);
    default:
      return getAcademicReadingBandScore(correctAnswers);
  }
};