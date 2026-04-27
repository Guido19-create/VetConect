import { PaginationDTO } from './pagination.dto';

export class PaginationResponseDto<T> {
  data: T[];
  meta: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextPage?: number;
    previousPage?: number;
  };

  constructor(data: T[], totalItems: number, paginationDto: PaginationDTO) {
    const { page = 1, limit = 10 } = paginationDto;
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    this.data = data;
    this.meta = {
      currentPage: page,
      itemsPerPage: limit,
      totalItems,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      nextPage: hasNextPage ? page + 1 : undefined,
      previousPage: hasPreviousPage ? page - 1 : undefined,
    };
  }
}
