import { db } from '../../config/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function createUserDocument(email) {
  try {
    // Create a new document with email as the ID (untuk memudahkan pencarian)
    const userDocRef = doc(db, 'users', email);
    
    await setDoc(userDocRef, {
      email: email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('User document created successfully');
    return true;
  } catch (error) {
    console.error('Error creating user document:', error);
    return false;
  }
}
