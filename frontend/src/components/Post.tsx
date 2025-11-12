import { useState } from 'react';
import axios from 'axios';
import CommentSection from './CommentSection';
import { Post as PostType } from '../types';
import { User } from '../context/AuthContext';

interface PostProps {
  post: PostType;
  currentUser: User;
  isAdmin: boolean;
  onPostUpdated: (post: PostType) => void;
  onPostDeleted: (postId: number) => void;
}

const Post = ({ post, currentUser, isAdmin, onPostUpdated, onPostDeleted }: PostProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const getInitials = (fullName?: string): string => {
    if (!fullName) return 'U';
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canEdit = currentUser.id === post.user_id || isAdmin;
  const canDelete = currentUser.id === post.user_id || isAdmin;

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    setLoading(true);
    try {
      const response = await axios.put<{ post: PostType }>(`/api/posts/${post.id}`, {
        content: editContent
      });
      onPostUpdated(response.data.post);
      setIsEditing(false);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || 'Failed to update post');
      } else {
        alert('Failed to update post');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setDeleting(true);
    try {
      await axios.delete(`/api/posts/${post.id}`);
      onPostDeleted(post.id);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || 'Failed to delete post');
      } else {
        alert('Failed to delete post');
      }
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 ${deleting ? 'opacity-50' : ''}`}>
      {post.deleted && (
        <div className="mb-3">
          <span className="px-3 py-1.5 text-xs font-semibold bg-red-50 border border-red-200 text-red-700 rounded-full inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            DELETED
          </span>
        </div>
      )}

      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 shadow-lg ring-2 ring-white">
          {getInitials(post.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-gray-900">{post.username}</span>
            <span className="text-sm text-gray-500">·</span>
            <span className="text-sm text-gray-500">{formatDate(post.created_at)}</span>
          </div>
          {post.edited && (
            <span className="text-xs text-gray-500 inline-flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {post.edited_by_admin ? 'Edited by admin' : 'Edited'}
            </span>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mb-4">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3 resize-none transition-all duration-200"
            disabled={loading}
          />
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm font-medium disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(post.content);
              }}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        </div>
      )}

      <div className="flex items-center gap-4 mb-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1.5 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {showComments ? 'Hide' : 'Show'} Comments ({post.comment_count || 0})
        </button>
        
        {canEdit && !post.deleted && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-600 hover:text-gray-700 text-sm font-medium hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5"
            disabled={deleting}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        )}
        
        {canDelete && !post.deleted && (
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 text-sm font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5"
            disabled={deleting}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      {showComments && (
        <CommentSection
          postId={post.id}
          currentUser={currentUser}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

export default Post;

