import { useState } from 'react';
import axios from 'axios';
import { Comment as CommentType } from '../types';
import { User } from '../context/AuthContext';

interface CommentProps {
  comment: CommentType;
  currentUser: User;
  isAdmin: boolean;
  onCommentUpdated: (comment: CommentType) => void;
  onCommentDeleted: (commentId: number) => void;
}

const Comment = ({ comment, currentUser, isAdmin, onCommentUpdated, onCommentDeleted }: CommentProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getInitials = (fullName?: string): string => {
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
      const response = await axios.put<{ comment: CommentType }>(`/api/comments/${comment.id}`, {
        content: editContent
      });
      onCommentUpdated(response.data.comment);
      setIsEditing(false);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || 'Failed to update comment');
      } else {
        alert('Failed to update comment');
      }
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
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || 'Failed to delete comment');
      } else {
        alert('Failed to delete comment');
      }
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className={`p-4 bg-gray-50 rounded-xl border border-gray-100 ${deleting ? 'opacity-50' : ''} hover:bg-gray-100/50 transition-colors duration-200`}>
      {comment.deleted && (
        <div className="mb-3">
          <span className="px-3 py-1.5 text-xs font-semibold bg-red-50 border border-red-200 text-red-700 rounded-full inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            DELETED
          </span>
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 shadow-md ring-2 ring-white">
          {getInitials(comment.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">{comment.username}</span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
          </div>
          {comment.edited && (
            <span className="text-xs text-gray-500 inline-flex items-center gap-1 mt-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
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
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2 text-sm resize-none transition-all duration-200"
            disabled={loading}
          />
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              disabled={loading}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-xs font-medium disabled:opacity-50 shadow-sm hover:shadow"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              disabled={loading}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="ml-12">
          <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{comment.content}</p>
        </div>
      )}

      <div className="flex items-center gap-3 mt-3 ml-12">
        {canEdit && !comment.deleted && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-600 hover:text-gray-700 text-xs font-medium hover:bg-gray-200 px-2 py-1 rounded-lg transition-all duration-200 flex items-center gap-1"
            disabled={deleting}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 text-xs font-medium hover:bg-red-50 px-2 py-1 rounded-lg transition-all duration-200 flex items-center gap-1"
            disabled={deleting}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Comment;

