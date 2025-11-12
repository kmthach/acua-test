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
    <div className="border-t pt-4 mt-4">
      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Posting...' : 'Comment'}
        </button>
      </form>

      {fetching ? (
        <div className="text-sm text-gray-500">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-gray-500">No comments yet</div>
      ) : (
        <div className="space-y-3">
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

