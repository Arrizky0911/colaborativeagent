import { createUserDocument } from './createUsers';

// Daftar email yang sudah terdaftar di Authentication
const existingEmails = [
  'loki@gmail.com',
  'thor@gmail.com'
  // Tambahkan email lain yang sudah terdaftar
];

export async function migrateExistingUsers() {
  try {
    for (const email of existingEmails) {
      await createUserDocument(email);
    }
    console.log('Successfully migrated existing users to Firestore');
  } catch (error) {
    console.error('Error migrating users:', error);
  }
}
