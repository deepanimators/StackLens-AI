import { ReactNode } from "react";
import TopNav from "@/components/top-nav";
import { VersionFooter } from "@/components/version-footer";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>
      <VersionFooter />
    </div>
  );
}