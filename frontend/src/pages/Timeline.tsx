import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Post from '../components/Post';
import PostForm from '../components/PostForm';
import SearchBar from '../components/SearchBar';
import { Post as PostType } from '../types';

interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

const POSTS_PER_PAGE = 5;

const Timeline = () => {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    limit: POSTS_PER_PAGE,
    offset: 0,
    total: 0,
    hasMore: true
  });
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const offsetRef = useRef(0);

  // Keep refs in sync with state
  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    hasMoreRef.current = pagination.hasMore;
    offsetRef.current = pagination.offset;
  }, [pagination.hasMore, pagination.offset]);

  const fetchPosts = useCallback(async (offset: number = 0, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      }

      const endpoint = searchQuery 
        ? `/api/posts/search?q=${encodeURIComponent(searchQuery)}&limit=${POSTS_PER_PAGE}&offset=${offset}`
        : `/api/posts?limit=${POSTS_PER_PAGE}&offset=${offset}`;
      
      console.log('Fetching posts:', { endpoint, offset, reset });
      
      const response = await axios.get<{ 
        posts: PostType[];
        pagination: PaginationInfo;
      }>(endpoint);
      
      console.log('Posts response:', {
        postsCount: response.data.posts.length,
        pagination: response.data.pagination
      });
      
      if (reset) {
        setPosts(response.data.posts);
      } else {
        setPosts(prev => [...prev, ...response.data.posts]);
      }
      
      setPagination(response.data.pagination);
      hasMoreRef.current = response.data.pagination.hasMore;
      offsetRef.current = response.data.pagination.offset;
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [searchQuery]);

  useEffect(() => {
    // Reset and fetch first page when search query changes
    setPosts([]);
    setPagination({
      limit: POSTS_PER_PAGE,
      offset: 0,
      total: 0,
      hasMore: true
    });
    hasMoreRef.current = true;
    offsetRef.current = 0;
    fetchPosts(0, true);
  }, [fetchPosts]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    // Wait for posts to load and observer target to be available
    if (loading || posts.length === 0) {
      return;
    }

    const currentTarget = observerTarget.current;
    
    console.log('Setting up observer:', {
      hasTarget: !!currentTarget,
      hasMore: pagination.hasMore,
      loadingMore: loadingMore,
      currentOffset: pagination.offset,
      postsCount: posts.length
    });
    
    if (!currentTarget) {
      console.warn('Observer target not found - retrying...');
      // Retry after a short delay
      const retryTimeout = setTimeout(() => {
        const retryTarget = observerTarget.current;
        if (retryTarget && pagination.hasMore) {
          console.log('Retry: Found target, setting up observer');
        }
      }, 500);
      return () => clearTimeout(retryTimeout);
    }
    
    if (!pagination.hasMore) {
      console.log('No more posts to load');
      return;
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      console.log('Intersection event:', {
        isIntersecting: entry.isIntersecting,
        intersectionRatio: entry.intersectionRatio,
        boundingClientRect: entry.boundingClientRect,
        hasMore: hasMoreRef.current,
        loadingMore: loadingMoreRef.current,
        currentOffset: pagination.offset
      });
      
      if (entry.isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
        // Use the current pagination offset from state
        const nextOffset = pagination.offset + POSTS_PER_PAGE;
        console.log('✅ Triggering loadMore with offset:', nextOffset, 'from current offset:', pagination.offset);
        fetchPosts(nextOffset, false);
      }
    };

    const observer = new IntersectionObserver(
      handleIntersection,
      { 
        threshold: [0, 0.1, 0.5, 1],
        rootMargin: '500px' // Trigger 500px before the element is visible
      }
    );

    // Small delay to ensure element is in DOM
    const timeoutId = setTimeout(() => {
      if (currentTarget && pagination.hasMore) {
        console.log('✅ Observing target element');
        observer.observe(currentTarget);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [fetchPosts, pagination.hasMore, loadingMore, pagination.offset, loading, posts.length]);

  const handlePostCreated = (newPost: PostType) => {
    setPosts([newPost, ...posts]);
  };

  const handlePostUpdated = (updatedPost: PostType) => {
    setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  const handlePostDeleted = useCallback((postId: number) => {
    if (isAdmin) {
      // Admin can see deleted posts, so just refresh
      setPosts([]);
      setPagination({
        limit: POSTS_PER_PAGE,
        offset: 0,
        total: 0,
        hasMore: true
      });
      fetchPosts(0, true);
    } else {
      // Regular users can't see deleted posts
      setPosts(prev => prev.filter(p => p.id !== postId));
    }
  }, [isAdmin, fetchPosts]);

  if (!user) {
    return null;
  }

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
        <>
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
          
          {/* Infinite scroll trigger */}
          {pagination.hasMore ? (
            <div 
              ref={observerTarget} 
              className="w-full flex items-center justify-center py-8"
              style={{ minHeight: '200px', height: '200px' }}
            >
              {loadingMore ? (
                <div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <p className="text-center text-gray-600 text-sm mt-2">Loading more posts...</p>
                </div>
              ) : (
                <div className="h-8 w-full bg-transparent"></div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500 text-sm">
              No more posts to load
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Timeline;

