"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, MoreHorizontal, Ban, CheckCircle2, Trash2, ShieldAlert } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { AdminUser, Pagination } from "@/types/api";

type AdminUsersResponse = { items: AdminUser[]; pagination: Pagination };

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const qs = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search) qs.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", qs.toString()],
    queryFn: () => api.get<AdminUsersResponse>(`/api/admin/users?${qs}`),
    enabled: me?.role === "ADMIN",
  });

  async function updateUser(id: string, input: Record<string, string>) {
    try {
      await api.patch(`/api/admin/users/${id}`, input);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário atualizado.");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Erro ao atualizar.",
      );
    }
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/users/${deleteTarget.id}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário excluído.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Erro ao excluir.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (me && me.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="font-medium">Acesso restrito</p>
        <p className="text-sm text-muted-foreground">
          Esta área é exclusiva para administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Painel administrativo
        </h2>
        <p className="text-sm text-muted-foreground">
          Gerencie os usuários da plataforma.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nome ou e-mail…"
          className="pl-8"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead className="text-right">Apostas</TableHead>
              <TableHead>Último login</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "ADMIN" ? "default" : "secondary"}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "ACTIVE" ? "success" : "destructive"
                      }
                    >
                      {user.status === "ACTIVE" ? "Ativo" : "Bloqueado"}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.plan}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {user.entriesCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    {user.id !== me?.id ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Ações do usuário"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Plano</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              updateUser(user.id, { planSlug: "free" })
                            }
                          >
                            Definir Free
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateUser(user.id, { planSlug: "pro" })
                            }
                          >
                            Definir Pro
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === "ACTIVE" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                updateUser(user.id, { status: "BLOCKED" })
                              }
                            >
                              <Ban /> Bloquear
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                updateUser(user.id, { status: "ACTIVE" })
                              }
                            >
                              <CheckCircle2 /> Desbloquear
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(user)}
                          >
                            <Trash2 /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            Página {data.pagination.page} de {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      ) : null}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
            <DialogDescription>
              Excluir “{deleteTarget?.email}” e todos os seus dados? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" loading={deleting} onClick={deleteUser}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
