import { useState } from 'react';
import axios from 'axios';

const Comment = ({ comment, currentUser, isAdmin, onCommentUpdated, onCommentDeleted }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canEdit = currentUser.id === comment.user_id || isAdmin;
  const canDelete = currentUser.id === comment.user_id || isAdmin;

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    setLoading(true);
    try {
      const response = await axios.put(`/api/comments/${comment.id}`, {
        content: editContent
      });
      onCommentUpdated(response.data.comment);
      setIsEditing(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setDeleting(true);
    try {
      await axios.delete(`/api/comments/${comment.id}`);
      onCommentDeleted(comment.id);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete comment');
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className={`p-3 bg-gray-50 rounded-md ${deleting ? 'opacity-50' : ''}`}>
      {comment.deleted && (
        <div className="mb-2">
          <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded">
            [DELETED]
          </span>
        </div>
      )}

      <div className="flex items-start gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {getInitials(comment.full_name)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">{comment.username}</span>
            <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
          </div>
          {comment.edited && (
            <span className="text-xs text-gray-500">
              {comment.edited_by_admin ? 'Edited by admin' : 'Edited'}
            </span>
          )}
        </div>
      </div>

      {isEditing ? (
        <div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 text-sm"
            disabled={loading}
          />
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-xs disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              disabled={loading}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="ml-10">
          <p className="text-gray-800 text-sm whitespace-pre-wrap">{comment.content}</p>
        </div>
      )}

      <div className="flex items-center gap-3 mt-2 ml-10">
        {canEdit && !comment.deleted && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-600 hover:text-gray-700 text-xs"
            disabled={deleting}
          >
            Edit
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 text-xs"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Comment;

