"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth/auth-card";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";

const schema = z
  .object({
    password: z
      .string()
      .min(10, "Mínimo de 10 caracteres")
      .regex(/[a-z]/, "Inclua uma letra minúscula")
      .regex(/[A-Z]/, "Inclua uma letra maiúscula")
      .regex(/[0-9]/, "Inclua um número")
      .regex(/[^a-zA-Z0-9]/, "Inclua um símbolo"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await api.post("/api/auth/reset-password", {
        token,
        password: values.password,
      });
      toast.success("Senha redefinida! Entre com a nova senha.");
      router.replace("/login");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Erro ao redefinir.",
      );
    }
  }

  if (!token) {
    return (
      <AuthCard
        title="Link inválido"
        description="O link de redefinição está incompleto ou expirou. Solicite um novo."
      >
        <Button asChild className="w-full">
          <Link href="/forgot-password">Solicitar novo link</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Nova senha"
      description="Defina uma nova senha para sua conta."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Nova senha"
          htmlFor="password"
          error={form.formState.errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 10 caracteres"
            {...form.register("password")}
          />
        </FormField>

        <FormField
          label="Confirmar senha"
          htmlFor="confirmPassword"
          error={form.formState.errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a senha"
            {...form.register("confirmPassword")}
          />
        </FormField>

        <Button
          type="submit"
          className="w-full"
          loading={form.formState.isSubmitting}
        >
          Redefinir senha
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
