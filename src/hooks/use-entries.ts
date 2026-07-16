"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import type { EntriesResponse, Entry } from "@/types/api";

export type EntryFilterParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sportId?: string;
  bookmakerId?: string;
  competition?: string;
  result?: string;
  profitMin?: string;
  profitMax?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export function buildEntriesQueryString(params: EntryFilterParams): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
}

export function useEntries(params: EntryFilterParams) {
  const qs = buildEntriesQueryString(params);
  return useQuery({
    queryKey: ["entries", qs],
    queryFn: () => api.get<EntriesResponse>(`/api/entries?${qs}`),
    placeholderData: keepPreviousData,
  });
}

function invalidateEntryData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["entries"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
  queryClient.invalidateQueries({ queryKey: ["stats"] });
}

function onApiError(error: unknown) {
  toast.error(error instanceof ApiError ? error.message : "Erro inesperado.");
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      api.post<Entry>("/api/entries", input),
    onSuccess: () => {
      invalidateEntryData(queryClient);
      toast.success("Entrada registrada.");
    },
    onError: onApiError,
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Record<string, unknown>) =>
      api.patch<Entry>(`/api/entries/${id}`, input),
    onSuccess: () => {
      invalidateEntryData(queryClient);
      toast.success("Entrada atualizada.");
    },
    onError: onApiError,
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/entries/${id}`),
    onSuccess: () => {
      invalidateEntryData(queryClient);
      toast.success("Entrada excluída.");
    },
    onError: onApiError,
  });
}

export function useBulkEntryAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: "delete" | "duplicate"; ids: string[] }) =>
      api.post<{ affected: number }>("/api/entries/bulk", input),
    onSuccess: (data, variables) => {
      invalidateEntryData(queryClient);
      toast.success(
        variables.action === "delete"
          ? `${data.affected} entrada(s) excluída(s).`
          : `${data.affected} entrada(s) duplicada(s).`,
      );
    },
    onError: onApiError,
  });
}
