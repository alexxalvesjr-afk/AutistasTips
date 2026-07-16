import nodemailer from "nodemailer";
import { env, isProduction } from "@/lib/env";

/**
 * Envio de e-mail transacional. Sem SMTP configurado (desenvolvimento),
 * o link é registrado no console — nunca em produção.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  if (!env.SMTP_HOST) {
    if (isProduction) {
      console.error("[mail] SMTP não configurado — e-mail não enviado");
      return;
    }
    console.info(`[mail:dev] Link de redefinição para ${to}: ${resetUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "Redefinição de senha — BetManager",
    text: [
      "Você solicitou a redefinição da sua senha no BetManager.",
      "",
      `Acesse o link abaixo (válido por 30 minutos):`,
      resetUrl,
      "",
      "Se você não solicitou, ignore este e-mail.",
    ].join("\n"),
  });
}
