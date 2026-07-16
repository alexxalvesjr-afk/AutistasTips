import {
  LayoutDashboard,
  ListPlus,
  Table2,
  FileBarChart,
  PieChart,
  Upload,
  Download,
  User,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/entries", label: "Entradas", icon: ListPlus },
  { href: "/sheet", label: "Planilha", icon: Table2 },
  { href: "/reports", label: "Relatórios", icon: FileBarChart },
  { href: "/stats", label: "Estatísticas", icon: PieChart },
  { href: "/import", label: "Importar", icon: Upload },
  { href: "/export", label: "Exportar", icon: Download },
  { href: "/profile", label: "Perfil", icon: User },
  { href: "/settings", label: "Configurações", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];
