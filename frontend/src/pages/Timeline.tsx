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
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
          Timeline
        </h1>
        <SearchBar onSearch={setSearchQuery} />
      </div>

      <PostForm onPostCreated={handlePostCreated} />

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-3 text-gray-600">
            <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg">Loading posts...</span>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xl text-gray-600 font-medium">
              {searchQuery ? 'No posts found' : 'No posts yet. Be the first to post!'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-6">
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
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <p className="text-center text-gray-600 text-sm font-medium">Loading more posts...</p>
                </div>
              ) : (
                <div className="h-8 w-full bg-transparent"></div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>No more posts to load</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Timeline;

