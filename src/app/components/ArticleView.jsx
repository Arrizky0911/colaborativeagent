import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import ShareArticle from './ShareArticle';
import { useAuth } from '../context/AuthContext';

export default function ArticleView({ articleId }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const articleRef = doc(db, 'articles', articleId);
        const articleSnap = await getDoc(articleRef);
        
        if (articleSnap.exists()) {
          setArticle({ id: articleSnap.id, ...articleSnap.data() });
        } else {
          setError('Article not found');
        }
      } catch (err) {
        setError('Error loading article');
        console.error('Error fetching article:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{article.title}</h1>
        {user && (
          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Share Article
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <span className="text-gray-600">Author:</span>
          <span className="ml-2 font-medium">{article.author}</span>
        </div>

        <div className="space-y-6">
          {article.content.map((msg, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                msg.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center mb-2">
                <span className="font-medium">
                  {msg.role === 'user' ? article.author : msg.expert?.name}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
        </div>
      </div>

      {showShareModal && (
        <ShareArticle
          articleId={articleId}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
