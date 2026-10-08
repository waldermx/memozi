import apiFetch from './api';
import type {
  DueCardDto,
  GetDueCardsResponse,
  SubmitReviewRequest,
  SubmitReviewResponse,
  ReviewStatsResponse,
} from '@memozi/shared';

export const reviewService = {
  async getDue(limit = 20): Promise<GetDueCardsResponse> {
    return apiFetch<GetDueCardsResponse>(`/review/due?limit=${limit}`);
  },

  async submit(payload: SubmitReviewRequest): Promise<SubmitReviewResponse> {
    return apiFetch<SubmitReviewResponse>('/review/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getStats(): Promise<ReviewStatsResponse> {
    return apiFetch<ReviewStatsResponse>('/review/stats');
  },

  async getForecast(): Promise<DueCardDto[]> {
    return apiFetch<DueCardDto[]>('/review/forecast');
  },
};
