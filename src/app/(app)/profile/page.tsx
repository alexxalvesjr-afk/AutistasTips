"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MonitorSmartphone, LogOut } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/forms/form-field";
import { api, ApiError } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { formatDate } from "@/lib/utils";
import type { SessionInfo } from "@/types/api";

const profileSchema = z.object({
  name: z.string().min(2, "Informe seu nome").max(120),
  initialBankroll: z.coerce.number().min(0, "Valor inválido"),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useMe();

  const { data: sessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<SessionInfo[]>("/api/sessions"),
  });

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", initialBankroll: 0 },
  });

  useEffect(() => {
    if (me) {
      form.reset({ name: me.name, initialBankroll: me.initialBankroll });
    }
  }, [me, form]);

  async function onSubmit(values: ProfileValues) {
    try {
      await api.patch("/api/profile", values);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Perfil atualizado.");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Erro ao salvar.",
      );
    }
  }

  async function revokeSession(id: string) {
    try {
      await api.delete(`/api/sessions/${id}`);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Sessão encerrada.");
    } catch {
      toast.error("Erro ao encerrar sessão.");
    }
  }

  async function logoutAll() {
    try {
      await api.post("/api/auth/logout-all");
      window.location.assign("/login");
    } catch {
      toast.error("Erro ao encerrar sessões.");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Perfil</h2>
        <p className="text-sm text-muted-foreground">
          Seus dados e sessões ativas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dados da conta</CardTitle>
          <CardDescription>
            {me?.email} · plano{" "}
            <Badge variant="default" className="align-middle">
              {me?.subscription?.plan.name ?? "Free"}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                label="Nome"
                htmlFor="name"
                error={form.formState.errors.name?.message}
              >
                <Input id="name" {...form.register("name")} />
              </FormField>

              <FormField
                label="Banca inicial (R$)"
                htmlFor="initialBankroll"
                error={form.formState.errors.initialBankroll?.message}
              >
                <Input
                  id="initialBankroll"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("initialBankroll")}
                />
              </FormField>

              <Button type="submit" loading={form.formState.isSubmitting}>
                Salvar alterações
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm">Sessões ativas</CardTitle>
            <CardDescription>
              Dispositivos conectados à sua conta.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={logoutAll}>
            <LogOut /> Sair de todos
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions?.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MonitorSmartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {session.userAgent?.slice(0, 60) ?? "Dispositivo"}
                    {session.current ? (
                      <Badge variant="success" className="ml-2">
                        atual
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Último uso: {formatDate(session.lastUsedAt)}
                  </p>
                </div>
              </div>
              {!session.current ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeSession(session.id)}
                >
                  Encerrar
                </Button>
              ) : null}
            </div>
          ))}
          {sessions?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma sessão ativa.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
