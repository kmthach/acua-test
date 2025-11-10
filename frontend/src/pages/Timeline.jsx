import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Post from '../components/Post';
import PostForm from '../components/PostForm';
import SearchBar from '../components/SearchBar';

const Timeline = () => {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [searchQuery]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const endpoint = searchQuery 
        ? `/api/posts/search?q=${encodeURIComponent(searchQuery)}`
        : '/api/posts';
      const response = await axios.get(endpoint);
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  const handlePostDeleted = (postId) => {
    if (isAdmin) {
      // Admin can see deleted posts, so just update the post
      fetchPosts();
    } else {
      // Regular users can't see deleted posts
      setPosts(posts.filter(p => p.id !== postId));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Timeline</h1>
        <SearchBar onSearch={setSearchQuery} />
      </div>

      <PostForm onPostCreated={handlePostCreated} />

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          {searchQuery ? 'No posts found' : 'No posts yet. Be the first to post!'}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Post
              key={post.id}
              post={post}
              currentUser={user}
              isAdmin={isAdmin}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Timeline;

