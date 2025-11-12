import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import Comment from './Comment';
import { Comment as CommentType } from '../types';
import { User } from '../context/AuthContext';

interface CommentSectionProps {
  postId: number;
  currentUser: User;
  isAdmin: boolean;
}

const CommentSection = ({ postId, currentUser, isAdmin }: CommentSectionProps) => {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      setFetching(true);
      const response = await axios.get<{ comments: CommentType[] }>(`/api/comments/post/${postId}`);
      setComments(response.data.comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post<{ comment: CommentType }>('/api/comments', {
        post_id: postId,
        content
      });
      setComments([response.data.comment, ...comments]);
      setContent('');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || 'Failed to create comment');
      } else {
        alert('Failed to create comment');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCommentUpdated = (updatedComment: CommentType) => {
    setComments(comments.map(c => c.id === updatedComment.id ? updatedComment : c));
  };

  const handleCommentDeleted = (commentId: number) => {
    if (isAdmin) {
      fetchComments();
    } else {
      setComments(comments.filter(c => c.id !== commentId));
    }
  };

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3 resize-none transition-all duration-200 placeholder:text-gray-400"
          disabled={loading}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{content.length} characters</span>
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Posting...
              </span>
            ) : (
              'Comment'
            )}
          </button>
        </div>
      </form>

      {fetching ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading comments...
          </div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <Comment
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onCommentUpdated={handleCommentUpdated}
              onCommentDeleted={handleCommentDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;

