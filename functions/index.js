const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure nodemailer with your email service credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

exports.sendArticleEmail = functions.firestore
  .document('articles/{articleId}')
  .onCreate(async (snap, context) => {
    const article = snap.data();
    const db = admin.firestore();

    try {
      // Send email to each recipient
      for (const recipientEmail of article.sharedWith) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: recipientEmail,
          subject: `New Article Shared: ${article.title}`,
          html: `
            <h2>${article.title}</h2>
            <p>Shared by: ${article.author}</p>
            <hr/>
            ${article.content.map(msg => `
              <div style="margin-bottom: 20px;">
                <p><strong>${msg.role === 'user' ? article.author : msg.expert?.name}</strong></p>
                <p>${msg.content}</p>
                <small style="color: #666;">${new Date(msg.timestamp).toLocaleString()}</small>
              </div>
            `).join('')}
            <hr/>
            <p>View this article in the application to respond.</p>
          `
        };

        await transporter.sendMail(mailOptions);
      }

      // Create notifications in Firestore
      const batch = db.batch();
      
      article.sharedWith.forEach(recipientEmail => {
        const notificationRef = db.collection('notifications').doc();
        batch.set(notificationRef, {
          recipientEmail,
          type: 'article_share',
          title: article.title,
          sender: article.author,
          articleId: context.params.articleId,
          message: `${article.author} shared an article with you: ${article.title}`,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error sending article emails:', error);
      throw new functions.https.HttpsError('internal', 'Error sending article emails');
    }
  });

// Function to mark notification as read
exports.markNotificationRead = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { notificationId } = data;
  
  try {
    await admin.firestore()
      .collection('notifications')
      .doc(notificationId)
      .update({ read: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new functions.https.HttpsError('internal', 'Error marking notification as read');
  }
});

// Function to validate email and share article
exports.shareArticle = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { articleId, recipientEmail } = data;
  
  try {
    const db = admin.firestore();
    
    // Check if recipient email exists in users collection
    const userSnapshot = await db.collection('users')
      .where('email', '==', recipientEmail)
      .get();

    if (userSnapshot.empty) {
      throw new functions.https.HttpsError(
        'failed-precondition', 
        'The specified email is not registered in the system'
      );
    }

    // Get the article
    const articleRef = db.collection('articles').doc(articleId);
    const article = await articleRef.get();

    if (!article.exists) {
      throw new functions.https.HttpsError('not-found', 'Article not found');
    }

    const articleData = article.data();

    // Update article's sharedWith array
    const sharedWith = articleData.sharedWith || [];
    if (!sharedWith.includes(recipientEmail)) {
      await articleRef.update({
        sharedWith: admin.firestore.FieldValue.arrayUnion(recipientEmail)
      });

      // Create notification
      await db.collection('notifications').add({
        recipientEmail,
        type: 'article_share',
        title: articleData.title,
        sender: context.auth.token.email,
        articleId,
        message: `${context.auth.token.email} shared an article with you: ${articleData.title}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });
    }

    return { success: true, message: 'Article shared successfully' };
  } catch (error) {
    console.error('Error sharing article:', error);
    throw new functions.https.HttpsError(
      error.code || 'internal',
      error.message || 'Error sharing article'
    );
  }
});
