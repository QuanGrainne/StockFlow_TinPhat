/**
 * Global TypeScript types shared across the entire application.
 */

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface SelectOption {
  label: string;
  value: string | number;
}
