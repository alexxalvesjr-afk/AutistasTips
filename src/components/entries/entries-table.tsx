"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileSpreadsheet,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntryFormDialog } from "@/components/entries/entry-form-dialog";
import {
  useBulkEntryAction,
  useDeleteEntry,
  useUpdateEntry,
  type EntryFilterParams,
} from "@/hooks/use-entries";
import { resultColors, resultLabels } from "@/lib/chart-colors";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { entryToExportRow, exportCsv, exportExcel } from "@/lib/export";
import type { EntriesResponse, Entry, EntryResult } from "@/types/api";

type SortField = "date" | "odd" | "stake" | "profit" | "game";

type EntriesTableProps = {
  data?: EntriesResponse;
  isLoading: boolean;
  filters: EntryFilterParams;
  onFiltersChange: (filters: EntryFilterParams) => void;
};

function ResultBadge({ result }: { result: EntryResult }) {
  return (
    <Badge variant="outline" className="gap-1.5 border-border">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: resultColors[result] }}
      />
      {resultLabels[result]}
    </Badge>
  );
}

/** Célula editável inline (duplo clique para editar, Enter/blur para salvar). */
function EditableNumberCell({
  value,
  onSave,
  format,
}: {
  value: number;
  onSave: (value: number) => void;
  format: (value: number) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (!editing) {
    return (
      <button
        type="button"
        className="w-full cursor-text rounded px-1 py-0.5 text-right tabular-nums hover:bg-accent"
        onDoubleClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        title="Duplo clique para editar"
      >
        {format(value)}
      </button>
    );
  }

  function commit() {
    setEditing(false);
    const parsed = Number(draft.replace(",", "."));
    if (!Number.isNaN(parsed) && parsed > 0 && parsed !== value) {
      onSave(parsed);
    }
  }

  return (
    <Input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      className="h-7 w-20 text-right tabular-nums"
    />
  );
}

export function EntriesTable({
  data,
  isLoading,
  filters,
  onFiltersChange,
}: EntriesTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);

  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();
  const bulkAction = useBulkEntryAction();

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const allSelected = items.length > 0 && items.every((e) => selected.has(e.id));
  const someSelected = items.some((e) => selected.has(e.id));

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        for (const item of items) next.delete(item.id);
        return next;
      }
      return new Set([...prev, ...items.map((e) => e.id)]);
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function sortBy(field: SortField) {
    const isCurrent = filters.sortBy === field;
    onFiltersChange({
      ...filters,
      sortBy: field,
      sortOrder: isCurrent && filters.sortOrder === "desc" ? "asc" : "desc",
      page: 1,
    });
  }

  function SortHeader({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) {
    const active = filters.sortBy === field;
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => sortBy(field)}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {children}
          {active ? (
            filters.sortOrder === "desc" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUp className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      </TableHead>
    );
  }

  const selectedEntries = items.filter((e) => selected.has(e.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {pagination
            ? `${pagination.total} entrada(s)`
            : "Carregando…"}
          {selected.size > 0 ? ` · ${selected.size} selecionada(s)` : ""}
        </p>

        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  bulkAction.mutate(
                    { action: "duplicate", ids: [...selected] },
                    { onSuccess: () => setSelected(new Set()) },
                  );
                }}
              >
                <Copy /> Duplicar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  bulkAction.mutate(
                    { action: "delete", ids: [...selected] },
                    { onSuccess: () => setSelected(new Set()) },
                  );
                }}
              >
                <Trash2 /> Excluir
              </Button>
            </>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  exportCsv(
                    (selectedEntries.length > 0 ? selectedEntries : items).map(
                      entryToExportRow,
                    ),
                  )
                }
              >
                <Download /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  exportExcel(
                    (selectedEntries.length > 0 ? selectedEntries : items).map(
                      entryToExportRow,
                    ),
                  )
                }
              >
                <FileSpreadsheet /> Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pl-3">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todas"
                />
              </TableHead>
              <SortHeader field="date">Data</SortHeader>
              <TableHead>Casa</TableHead>
              <TableHead>Esporte</TableHead>
              <SortHeader field="game">Jogo</SortHeader>
              <TableHead>Mercado</TableHead>
              <SortHeader field="odd" className="text-right">Odd</SortHeader>
              <SortHeader field="stake" className="text-right">Stake</SortHeader>
              <TableHead>Resultado</TableHead>
              <SortHeader field="profit" className="text-right">Lucro</SortHeader>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={11}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhuma entrada encontrada.
                </TableCell>
              </TableRow>
            ) : (
              items.map((entry) => (
                <TableRow
                  key={entry.id}
                  data-state={selected.has(entry.id) ? "selected" : undefined}
                >
                  <TableCell className="pl-3">
                    <Checkbox
                      checked={selected.has(entry.id)}
                      onCheckedChange={() => toggleOne(entry.id)}
                      aria-label="Selecionar linha"
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatDate(entry.date)}
                  </TableCell>
                  <TableCell className="max-w-28 truncate">
                    {entry.bookmaker?.name ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-28 truncate">
                    {entry.sport?.name ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-52">
                    <p className="truncate font-medium">{entry.game}</p>
                    {entry.tags.length > 0 ? (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full px-1.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${tag.color}26`,
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-muted-foreground">
                    {entry.market ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableNumberCell
                      value={entry.odd}
                      format={(v) => formatNumber(v, 2)}
                      onSave={(odd) =>
                        updateEntry.mutate({ id: entry.id, odd })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableNumberCell
                      value={entry.stake}
                      format={(v) => formatCurrency(v)}
                      onSave={(stake) =>
                        updateEntry.mutate({ id: entry.id, stake })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={entry.result}
                      onValueChange={(result) =>
                        updateEntry.mutate({ id: entry.id, result })
                      }
                    >
                      <SelectTrigger
                        className="h-7 w-32 border-none bg-transparent px-1 shadow-none"
                        aria-label="Alterar resultado"
                      >
                        <SelectValue asChild>
                          <span>
                            <ResultBadge result={entry.result} />
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(resultLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      entry.profit > 0 && "text-success",
                      entry.profit < 0 && "text-destructive",
                    )}
                  >
                    {formatCurrency(entry.profit)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Ações"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditEntry(entry)}>
                          <Pencil /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            bulkAction.mutate({
                              action: "duplicate",
                              ids: [entry.id],
                            })
                          }
                        >
                          <Copy /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(entry)}
                        >
                          <Trash2 /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Linhas por página</span>
            <Select
              value={String(filters.pageSize ?? 25)}
              onValueChange={(v) =>
                onFiltersChange({ ...filters, pageSize: Number(v), page: 1 })
              }
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page <= 1}
              onClick={() =>
                onFiltersChange({ ...filters, page: (filters.page ?? 1) - 1 })
              }
              aria-label="Página anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                onFiltersChange({ ...filters, page: (filters.page ?? 1) + 1 })
              }
              aria-label="Próxima página"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}

      <EntryFormDialog
        open={editEntry !== null}
        onOpenChange={(open) => !open && setEditEntry(null)}
        entry={editEntry}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir entrada</DialogTitle>
            <DialogDescription>
              Excluir “{deleteTarget?.game}”? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              loading={deleteEntry.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteEntry.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
