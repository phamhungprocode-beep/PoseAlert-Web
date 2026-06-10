import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { BackgroundBlobs } from "./BackgroundBlobs";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-foreground">
      <BackgroundBlobs />
      <Sidebar />
      <MobileNav />
      <div className="lg:pl-64">
        <Header />
        <main className="px-4 lg:px-10 py-6 pb-24 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}