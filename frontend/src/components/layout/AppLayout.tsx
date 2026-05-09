import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { Menu } from "lucide-react";

export default function AppLayout() {
  const [darkMode, setDarkMode] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-[40]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <img src="/my-logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-sm font-bold text-foreground">PetroView</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Menu className="w-6 h-6 text-foreground" />
        </button>
      </header>

      <main
        className={`transition-all duration-300 p-4 md:p-6 min-h-screen ${collapsed ? "md:ml-[72px]" : "md:ml-[260px]"
          } ml-0`}
      >
        <Outlet context={{ collapsed }} />
      </main>
    </div>
  );
}
