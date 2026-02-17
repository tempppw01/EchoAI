'use client';
import { useQuery } from '@tanstack/react-query';
import { mockModels } from '@/lib/fetcher';

export const useModelsQuery = () =>
  useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 120));
      return mockModels;
    },
  });
