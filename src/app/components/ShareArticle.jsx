import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { shareArticle } from '../utils/articleSharing';

export default function ShareArticle({ articleId, onClose }) {
  const [email, setEmail] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [sharingStatus, setSharingStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleAddRecipient = (e) => {
    e.preventDefault();
    if (email && !recipients.includes(email)) {
      setRecipients([...recipients, email]);
      setEmail('');
    }
  };

  const handleRemoveRecipient = (emailToRemove) => {
    setRecipients(recipients.filter(email => email !== emailToRemove));
    setSharingStatus(prevStatus => {
      const newStatus = { ...prevStatus };
      delete newStatus[emailToRemove];
      return newStatus;
    });
  };

  const handleShare = async () => {
    if (!user) {
      setSharingStatus({ error: 'You must be logged in to share articles' });
      return;
    }

    setLoading(true);

    for (const recipientEmail of recipients) {
      try {
        setSharingStatus(prev => ({
          ...prev,
          [recipientEmail]: { status: 'sending' }
        }));

        await shareArticle(articleId, recipientEmail, user.email);
        
        setSharingStatus(prev => ({
          ...prev,
          [recipientEmail]: { status: 'success', message: 'Shared successfully' }
        }));
      } catch (error) {
        setSharingStatus(prev => ({
          ...prev,
          [recipientEmail]: { 
            status: 'error', 
            message: error.message || 'Failed to share article' 
          }
        }));
      }
    }

    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sending': return 'text-yellow-500';
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Share Article</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleAddRecipient} className="mb-4">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter recipient's email"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </form>

        {recipients.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recipients:</h3>
            <div className="space-y-2">
              {recipients.map((recipientEmail) => (
                <div
                  key={recipientEmail}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <span>{recipientEmail}</span>
                    {sharingStatus[recipientEmail] && (
                      <span className={getStatusColor(sharingStatus[recipientEmail].status)}>
                        {sharingStatus[recipientEmail].status === 'sending' ? 'Sending...' :
                         sharingStatus[recipientEmail].message}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveRecipient(recipientEmail)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            disabled={loading || recipients.length === 0}
          >
            {loading ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
}
