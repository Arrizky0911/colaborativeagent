import { auth, db } from '../../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export async function migrateUserToFirestore(user) {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    // Only create document if it doesn't exist
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        email: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`Migrated user ${user.email} to Firestore`);
    }
  } catch (error) {
    console.error(`Error migrating user ${user.email}:`, error);
  }
}

// Add this to your AuthContext useEffect
export function setupUserMigration() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      migrateUserToFirestore(user);
    }
  });
}
