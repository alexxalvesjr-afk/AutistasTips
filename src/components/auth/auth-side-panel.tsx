"use client";

import { motion } from "framer-motion";
import { TrendingUp, Target, LineChart, ShieldCheck } from "lucide-react";

const highlights = [
  {
    icon: LineChart,
    title: "Evolução da banca em tempo real",
    description: "Gráficos de lucro, ROI e win rate atualizados a cada entrada.",
  },
  {
    icon: Target,
    title: "Filtros profissionais",
    description: "Por esporte, casa, mercado, período, odd e resultado.",
  },
  {
    icon: ShieldCheck,
    title: "Seus dados, protegidos",
    description: "Criptografia de ponta e sessões independentes por dispositivo.",
  },
];

/** Painel visual do fluxo de autenticação — gradiente + mini gráfico animado. */
export function AuthSidePanel() {
  return (
    <div className="relative hidden overflow-hidden border-l bg-sidebar lg:block">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(347_77%_50%/0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,hsl(347_77%_40%/0.12),transparent_50%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.4)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />

      <div className="relative flex h-full flex-col justify-center gap-12 p-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="h-6 w-6" />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              BetManager
            </span>
          </div>
          <h2 className="mt-6 max-w-md text-3xl font-semibold leading-tight tracking-tight">
            A planilha inteligente para quem leva apostas a sério.
          </h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            Registre entradas, acompanhe o desempenho e tome decisões com dados
            — tudo em um dashboard rápido e minimalista.
          </p>
        </motion.div>

        <motion.svg
          viewBox="0 0 400 120"
          className="max-w-md text-primary"
          initial="hidden"
          animate="visible"
        >
          <motion.path
            d="M0 100 L50 85 L100 92 L150 60 L200 70 L250 40 L300 48 L350 20 L400 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            variants={{
              hidden: { pathLength: 0 },
              visible: {
                pathLength: 1,
                transition: { duration: 1.6, ease: "easeInOut", delay: 0.3 },
              },
            }}
          />
          <motion.path
            d="M0 100 L50 85 L100 92 L150 60 L200 70 L250 40 L300 48 L350 20 L400 28 L400 120 L0 120 Z"
            fill="url(#auth-gradient)"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 1, delay: 1.2 } },
            }}
          />
          <defs>
            <linearGradient id="auth-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
        </motion.svg>

        <div className="space-y-5">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.15 }}
            >
              <div className="rounded-md border bg-card p-2 text-primary">
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
