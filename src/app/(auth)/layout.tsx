import { AuthSidePanel } from "@/components/auth/auth-side-panel";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="dark grid min-h-svh bg-background text-foreground lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <AuthSidePanel />
    </div>
  );
}
