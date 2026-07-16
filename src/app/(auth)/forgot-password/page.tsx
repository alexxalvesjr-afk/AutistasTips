"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await api.post("/api/auth/forgot-password", values);
      setSent(true);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Erro ao enviar.",
      );
    }
  }

  if (sent) {
    return (
      <AuthCard
        title="Verifique seu e-mail"
        description="Se o endereço estiver cadastrado, enviamos um link para redefinir sua senha. O link expira em 30 minutos."
      >
        <div className="flex justify-center py-6 text-primary">
          <MailCheck className="h-12 w-12" />
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Voltar ao login</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Recuperar senha"
      description="Informe seu e-mail e enviaremos um link de redefinição."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

        <Button
          type="submit"
          className="w-full"
          loading={form.formState.isSubmitting}
        >
          Enviar link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
