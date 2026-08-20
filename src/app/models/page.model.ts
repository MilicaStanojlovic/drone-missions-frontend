/**
 * Spring Data's `PagedModel` envelope — the JSON shape every paginated backend
 * endpoint returns. `page.number` is 0-based.
 */
export interface PagedModel<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}
