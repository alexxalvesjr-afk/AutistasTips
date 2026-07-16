"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntryFormDialog } from "@/components/entries/entry-form-dialog";
import { EntriesTable } from "@/components/entries/entries-table";
import { useEntries, type EntryFilterParams } from "@/hooks/use-entries";

function EntriesContent() {
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<EntryFilterParams>({
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const { data, isLoading } = useEntries(filters);

  useEffect(() => {
    if (searchParams.get("new") === "1") setDialogOpen(true);
  }, [searchParams]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Cadastro de apostas
          </h2>
          <p className="text-sm text-muted-foreground">
            Registre novas entradas e acompanhe as mais recentes.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus /> Nova entrada
        </Button>
      </div>

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

export default function EntriesPage() {
  return (
    <Suspense>
      <EntriesContent />
    </Suspense>
  );
}
