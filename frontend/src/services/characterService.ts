import apiFetch from './api';
import type { CharacterDto, CharacterWithCardDto } from '@memozi/shared';

export interface CharacterSearchResult {
  id: string;
  character: string;
  pinyin: string;
  definition: string;
  hskLevel: number;
  cardState?: string;
}

export const characterService = {
  async listByHsk(level: number, page = 1, limit = 50): Promise<CharacterWithCardDto[]> {
    return apiFetch<CharacterWithCardDto[]>(`/characters?hskLevel=${level}&page=${page}&limit=${limit}`);
  },

  async getById(id: string): Promise<CharacterDto> {
    return apiFetch<CharacterDto>(`/characters/${id}`);
  },

  async searchByPinyin(query: string, locale = 'es'): Promise<CharacterSearchResult[]> {
    const encoded = encodeURIComponent(query.trim());
    if (!encoded) return [];
    return apiFetch<CharacterSearchResult[]>(`/characters/search?q=${encoded}&locale=${locale}`);
  },
};
