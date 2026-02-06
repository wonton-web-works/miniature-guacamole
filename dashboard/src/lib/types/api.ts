export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
  meta?: {
    cached?: boolean;
    cacheAge?: number;
    [key: string]: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
