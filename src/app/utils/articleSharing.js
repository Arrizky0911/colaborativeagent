import { 
  doc,
  updateDoc,
  arrayUnion,
  addDoc,
  serverTimestamp,
  collection,
  getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { createUserDocument } from './createUsers';

export async function shareArticle(articleId, recipientEmail, senderEmail) {
  try {
    // Check if recipient email exists in users collection using email as document ID
    const userDocRef = doc(db, 'users', recipientEmail);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Try to create user document
      const created = await createUserDocument(recipientEmail);
      if (!created) {
        throw new Error('The specified email is not registered in the system');
      }
    }

    // Get the article
    const articleRef = doc(db, 'articles', articleId);

    // Update article's sharedWith array
    await updateDoc(articleRef, {
      sharedWith: arrayUnion(recipientEmail)
    });

    // Create notification
    await addDoc(collection(db, 'notifications'), {
      recipientEmail,
      type: 'article_share',
      articleId,
      sender: senderEmail,
      timestamp: serverTimestamp(),
      read: false,
      title: 'New Article Shared',
      message: `${senderEmail} shared an article with you`
    });

    return { success: true, message: 'Article shared successfully' };
  } catch (error) {
    console.error('Error sharing article:', error);
    throw error;
  }
}
