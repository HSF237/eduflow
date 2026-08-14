import PocketBase from 'pocketbase';

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://edusphere-app.pockethost.io';

export const pb = new PocketBase(POCKETBASE_URL);

// Auto-cancellation disable for concurrent React queries
pb.autoCancellation(false);

/**
 * PocketBase Authentication Helpers
 */
export const pbLogin = async (email, password) => {
  return await pb.collection('users').authWithPassword(email, password);
};

export const pbSignup = async ({ email, password, name, role = 'TEACHER' }) => {
  const user = await pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    name,
    role: role.toUpperCase(),
  });
  // Auto-login after creation
  return await pb.collection('users').authWithPassword(email, password);
};

export const pbLogout = () => {
  pb.authStore.clear();
};

export const pbGetCurrentUser = () => {
  return pb.authStore.record;
};

/**
 * PocketBase Helper to format File URLs
 */
export const getPbFileUrl = (record, filename) => {
  if (!record || !filename) return '';
  return pb.files.getUrl(record, filename);
};
