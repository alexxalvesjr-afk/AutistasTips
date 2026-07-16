"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { FormField } from "@/components/forms/form-field";
import { api, ApiError } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z
      .string()
      .min(10, "Mínimo de 10 caracteres")
      .regex(/[a-z]/, "Inclua uma letra minúscula")
      .regex(/[A-Z]/, "Inclua uma letra maiúscula")
      .regex(/[0-9]/, "Inclua um número")
      .regex(/[^a-zA-Z0-9]/, "Inclua um símbolo"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { theme, setTheme } = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  async function savePreference(partial: Record<string, string>) {
    try {
      await api.patch("/api/profile", partial);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Preferência salva.");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Erro ao salvar.",
      );
    }
  }

  async function onChangePassword(values: PasswordValues) {
    try {
      await api.post("/api/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.reset();
      toast.success("Senha alterada. Outras sessões foram encerradas.");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Erro ao alterar senha.",
      );
    }
  }

  async function onDeleteAccount() {
    setDeleting(true);
    try {
      await api.delete("/api/account", { password: deletePassword });
      window.location.assign("/login");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Erro ao excluir conta.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Aparência, preferências e segurança da conta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preferências</CardTitle>
          <CardDescription>
            Ajuste o visual e os formatos de exibição.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tema</Label>
            <Select
              value={theme ?? "dark"}
              onValueChange={(value) => {
                setTheme(value);
                savePreference({ theme: value });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Idioma</Label>
            <Select
              value={me?.locale ?? "pt-BR"}
              onValueChange={(value) => savePreference({ locale: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Moeda</Label>
            <Select
              value={me?.currency ?? "BRL"}
              onValueChange={(value) => savePreference({ currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">Real (R$)</SelectItem>
                <SelectItem value="USD">Dólar (US$)</SelectItem>
                <SelectItem value="EUR">Euro (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Formato decimal</Label>
            <Select
              value={me?.decimalFormat ?? "comma"}
              onValueChange={(value) =>
                savePreference({ decimalFormat: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comma">Vírgula (1.234,56)</SelectItem>
                <SelectItem value="dot">Ponto (1,234.56)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Trocar senha</CardTitle>
          <CardDescription>
            Ao alterar a senha, as outras sessões são encerradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit(onChangePassword)}
            className="space-y-4"
          >
            <FormField
              label="Senha atual"
              htmlFor="currentPassword"
              error={passwordForm.formState.errors.currentPassword?.message}
            >
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...passwordForm.register("currentPassword")}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Nova senha"
                htmlFor="newPassword"
                error={passwordForm.formState.errors.newPassword?.message}
              >
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register("newPassword")}
                />
              </FormField>

              <FormField
                label="Confirmar nova senha"
                htmlFor="confirmPassword"
                error={passwordForm.formState.errors.confirmPassword?.message}
              >
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register("confirmPassword")}
                />
              </FormField>
            </div>

            <Button
              type="submit"
              loading={passwordForm.formState.isSubmitting}
            >
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> Zona de perigo
          </CardTitle>
          <CardDescription>
            Excluir sua conta remove permanentemente todas as suas entradas,
            relatórios e dados. Esta ação não pode ser desfeita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Excluir conta
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir conta</DialogTitle>
            <DialogDescription>
              Confirme sua senha para excluir permanentemente sua conta e todos
              os dados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="delete-password">Senha</Label>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              loading={deleting}
              disabled={deletePassword.length === 0}
              onClick={onDeleteAccount}
            >
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
