"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
    name: z.string().min(2, "Informe seu nome"),
    email: z.string().email("E-mail inválido"),
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

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await api.post("/api/auth/register", {
        name: values.name,
        email: values.email,
        password: values.password,
      });
      toast.success("Conta criada com sucesso!");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Erro ao criar conta.",
      );
    }
  }

  return (
    <AuthCard
      title="Crie sua conta"
      description="Comece a gerenciar suas apostas como um profissional."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Nome"
          htmlFor="name"
          error={form.formState.errors.name?.message}
        >
          <Input
            id="name"
            autoComplete="name"
            placeholder="Seu nome"
            {...form.register("name")}
          />
        </FormField>

        <FormField
          label="E-mail"
          htmlFor="email"
          error={form.formState.errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            {...form.register("email")}
          />
        </FormField>

        <FormField
          label="Senha"
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
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
