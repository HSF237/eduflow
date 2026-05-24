/**
 * Utility functions for EduSphere ERP
 */
import { pagesConfig } from './pages.config';

/**
 * Generates a URL for a given page name based on the configuration.
 * @param {string} pageName - The name of the page as defined in pagesConfig.
 * @param {Object} params - Optional URL parameters.
 * @returns {string} The generated URL.
 */
export const createPageUrl = (pageName, params = {}) => {
  const { Pages } = pagesConfig;
  
  if (!Pages[pageName]) {
    console.warn(`Page "${pageName}" not found in pagesConfig.`);
    return '#';
  }

  // In our local Vite setup, we use simple paths.
  // Base44 usually has a more complex structure, but for this migrated version:
  let url = `/${pageName.toLowerCase()}`;

  // Append query parameters if any
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${url}?${queryString}` : url;
};

/**
 * Formats a date string to a human-readable format.
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Validates an email address.
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};
