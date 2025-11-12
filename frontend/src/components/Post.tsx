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
    <div className={`bg-white rounded-lg shadow-md p-6 ${deleting ? 'opacity-50' : ''}`}>
      {post.deleted && (
        <div className="mb-2">
          <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded">
            [DELETED]
          </span>
        </div>
      )}

      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
          {getInitials(post.full_name)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{post.username}</span>
            <span className="text-sm text-gray-500">{formatDate(post.created_at)}</span>
          </div>
          {post.edited && (
            <span className="text-xs text-gray-500">
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
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            disabled={loading}
          />
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(post.content);
              }}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
        >
          {showComments ? 'Hide' : 'Show'} Comments ({post.comment_count || 0})
        </button>
        
        {canEdit && !post.deleted && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-600 hover:text-gray-700 text-sm"
            disabled={deleting}
          >
            Edit
          </button>
        )}
        
        {canDelete && !post.deleted && (
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 text-sm"
            disabled={deleting}
          >
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

