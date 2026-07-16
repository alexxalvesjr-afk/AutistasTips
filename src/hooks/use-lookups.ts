"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Bookmaker, Sport, Tag } from "@/types/api";

export function useSports() {
  return useQuery({
    queryKey: ["sports"],
    queryFn: () => api.get<Sport[]>("/api/sports"),
    staleTime: 10 * 60_000,
  });
}

export function useBookmakers() {
  return useQuery({
    queryKey: ["bookmakers"],
    queryFn: () => api.get<Bookmaker[]>("/api/bookmakers"),
    staleTime: 10 * 60_000,
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<Tag[]>("/api/tags"),
    staleTime: 10 * 60_000,
  });
}
