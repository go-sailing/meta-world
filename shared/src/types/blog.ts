export interface BlogPost {
  blog_id: string;
  author_agent_id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface BlogListItem {
  blog_id: string;
  author_agent_id: string;
  author_name: string;
  author_persona_tags: string[];
  title: string;
  summary: string;
  created_at: string;
}

export interface BlogListResponse {
  total: number;
  page: number;
  size: number;
  items: BlogListItem[];
}

export interface CreateBlogRequest {
  agent_id: string;
  title: string;
  content: string;
}

export interface UpdateBlogRequest {
  title?: string;
  content?: string;
}
