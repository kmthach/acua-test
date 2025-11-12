export interface Post {
  id: number;
  user_id: number;
  content: string;
  deleted: boolean;
  edited: boolean;
  edited_by_admin: boolean;
  created_at: string;
  updated_at: string;
  username?: string;
  full_name?: string;
  comment_count?: number;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  deleted: boolean;
  edited: boolean;
  edited_by_admin: boolean;
  created_at: string;
  updated_at: string;
  username?: string;
  full_name?: string;
}

