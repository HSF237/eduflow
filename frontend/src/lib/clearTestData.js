/**
 * Utility to clear all local testing data, cached school sessions, and mock records
 */
export const clearAllLocalTestData = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.clear();
    sessionStorage.clear();
    console.log('🧹 All local test data, cached schools, students, and session tokens have been cleared successfully.');
  }
};
