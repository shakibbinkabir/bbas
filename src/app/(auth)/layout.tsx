import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="flex items-center justify-between px-4 py-4 md:px-8">
        <Logo size="md" href="/" />
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-sm md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
