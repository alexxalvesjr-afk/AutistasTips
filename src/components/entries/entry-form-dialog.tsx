"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { useBookmakers, useSports, useTags } from "@/hooks/use-lookups";
import { useCreateEntry, useUpdateEntry } from "@/hooks/use-entries";
import { resultLabels } from "@/lib/chart-colors";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import type { Entry, Tag } from "@/types/api";

const NONE = "__none__";

const schema = z.object({
  date: z.string().min(1, "Informe a data"),
  bookmakerId: z.string().optional(),
  sportId: z.string().optional(),
  competition: z.string().max(120).optional(),
  game: z.string().min(1, "Informe o jogo/evento").max(160),
  market: z.string().max(120).optional(),
  selection: z.string().max(160).optional(),
  odd: z.coerce.number().min(1.001, "Odd deve ser maior que 1"),
  stake: z.coerce.number().positive("Stake deve ser positiva"),
  result: z.enum(["PENDING", "WIN", "LOSS", "VOID", "HALF_WIN", "HALF_LOSS"]),
  notes: z.string().max(1000).optional(),
  tagNames: z.string().max(200).optional(),
});

type FormValues = z.infer<typeof schema>;

type EntryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: Entry | null;
};

function toFormValues(entry?: Entry | null): FormValues {
  return {
    date: entry
      ? entry.date.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    bookmakerId: entry?.bookmaker?.id ?? NONE,
    sportId: entry?.sport?.id ?? NONE,
    competition: entry?.competition ?? "",
    game: entry?.game ?? "",
    market: entry?.market ?? "",
    selection: entry?.selection ?? "",
    odd: entry?.odd ?? 1.9,
    stake: entry?.stake ?? 10,
    result: entry?.result ?? "PENDING",
    notes: entry?.notes ?? "",
    tagNames: entry?.tags.map((t) => t.name).join(", ") ?? "",
  };
}

export function EntryFormDialog({ open, onOpenChange, entry }: EntryFormDialogProps) {
  const queryClient = useQueryClient();
  const { data: sports } = useSports();
  const { data: bookmakers } = useBookmakers();
  const { data: existingTags } = useTags();
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(entry),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(entry));
  }, [open, entry, form]);

  async function resolveTagIds(tagNames: string): Promise<string[]> {
    const names = tagNames
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, 10);

    const ids: string[] = [];
    for (const name of names) {
      const existing = existingTags?.find(
        (t) => t.name.toLowerCase() === name.toLowerCase(),
      );
      if (existing) {
        ids.push(existing.id);
      } else {
        const tag = await api.post<Tag>("/api/tags", { name });
        ids.push(tag.id);
      }
    }
    if (ids.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    }
    return ids;
  }

  async function onSubmit(values: FormValues) {
    const tagIds = await resolveTagIds(values.tagNames ?? "");
    const payload = {
      date: values.date,
      bookmakerId: values.bookmakerId === NONE ? null : values.bookmakerId,
      sportId: values.sportId === NONE ? null : values.sportId,
      competition: values.competition || null,
      game: values.game,
      market: values.market || null,
      selection: values.selection || null,
      odd: values.odd,
      stake: values.stake,
      result: values.result,
      notes: values.notes || null,
      tagIds,
    };

    if (entry) {
      await updateEntry.mutateAsync({ id: entry.id, ...payload });
    } else {
      await createEntry.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entry ? "Editar entrada" : "Nova entrada"}</DialogTitle>
          <DialogDescription>
            {entry
              ? "Atualize os dados da aposta."
              : "Registre uma nova aposta na sua planilha."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            label="Data"
            htmlFor="date"
            error={form.formState.errors.date?.message}
          >
            <Input id="date" type="date" {...form.register("date")} />
          </FormField>

          <FormField label="Casa de aposta" htmlFor="bookmakerId">
            <Controller
              control={form.control}
              name="bookmakerId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="bookmakerId">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Nenhuma —</SelectItem>
                    {bookmakers?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Esporte" htmlFor="sportId">
            <Controller
              control={form.control}
              name="sportId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="sportId">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Nenhum —</SelectItem>
                    {sports?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Campeonato"
            htmlFor="competition"
            error={form.formState.errors.competition?.message}
          >
            <Input
              id="competition"
              placeholder="Ex.: Brasileirão Série A"
              {...form.register("competition")}
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField
              label="Jogo / Evento"
              htmlFor="game"
              error={form.formState.errors.game?.message}
            >
              <Input
                id="game"
                placeholder="Ex.: Flamengo x Palmeiras"
                {...form.register("game")}
              />
            </FormField>
          </div>

          <FormField
            label="Mercado"
            htmlFor="market"
            error={form.formState.errors.market?.message}
          >
            <Input
              id="market"
              placeholder="Ex.: Over 2.5 gols"
              {...form.register("market")}
            />
          </FormField>

          <FormField
            label="Seleção"
            htmlFor="selection"
            error={form.formState.errors.selection?.message}
          >
            <Input
              id="selection"
              placeholder="Ex.: Mais de 2.5"
              {...form.register("selection")}
            />
          </FormField>

          <FormField
            label="Odd"
            htmlFor="odd"
            error={form.formState.errors.odd?.message}
          >
            <Input
              id="odd"
              type="number"
              step="0.001"
              min="1.001"
              {...form.register("odd")}
            />
          </FormField>

          <FormField
            label="Valor investido (stake)"
            htmlFor="stake"
            error={form.formState.errors.stake?.message}
          >
            <Input
              id="stake"
              type="number"
              step="0.01"
              min="0.01"
              {...form.register("stake")}
            />
          </FormField>

          <FormField label="Resultado" htmlFor="result">
            <Controller
              control={form.control}
              name="result"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="result">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(resultLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Tags (separadas por vírgula)"
            htmlFor="tagNames"
            error={form.formState.errors.tagNames?.message}
          >
            <Input
              id="tagNames"
              placeholder="Ex.: live, alavancagem"
              {...form.register("tagNames")}
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField
              label="Observações"
              htmlFor="notes"
              error={form.formState.errors.notes?.message}
            >
              <Textarea
                id="notes"
                rows={3}
                placeholder="Anotações sobre a entrada…"
                {...form.register("notes")}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {entry ? "Salvar alterações" : "Registrar entrada"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
