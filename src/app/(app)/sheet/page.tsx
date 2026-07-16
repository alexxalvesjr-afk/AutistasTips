"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntryFiltersBar } from "@/components/entries/entry-filters";
import { EntriesTable } from "@/components/entries/entries-table";
import { EntryFormDialog } from "@/components/entries/entry-form-dialog";
import { useEntries, type EntryFilterParams } from "@/hooks/use-entries";

type SheetFilters = EntryFilterParams & { period?: string };

export default function SheetPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<SheetFilters>({
    page: 1,
    pageSize: 25,
    sortBy: "date",
    sortOrder: "desc",
  });

  const { period: _period, ...apiFilters } = filters;
  const { data, isLoading } = useEntries(apiFilters);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Planilha</h2>
          <p className="text-sm text-muted-foreground">
            Todas as suas entradas — filtre, edite inline e exporte.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus /> Nova entrada
        </Button>
      </div>

      <EntryFiltersBar filters={filters} onChange={setFilters} />

      <EntriesTable
        data={data}
        isLoading={isLoading}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <EntryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
