import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Droplets, Map, BarChart3, Users, FileText,
  ChevronLeft, ChevronRight, Flame, Sun, Moon, LogOut, Shield,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", path: "/", adminOnly: false },
  { icon: Droplets, label: "Puits", path: "/wells", adminOnly: false },
  { icon: Map, label: "Carte", path: "/map", adminOnly: false },
  { icon: FileText, label: "Visualisation", path: "/visualization", adminOnly: false },
  { icon: BarChart3, label: "Analyses", path: "/analysis", adminOnly: false },
  { icon: Users, label: "Utilisateurs", path: "/users", adminOnly: true },
];

interface AppSidebarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export default function AppSidebar({ 
  darkMode, 
  toggleDarkMode, 
  collapsed, 
  onCollapse,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const role = user?.role || "user"; 
  const isAdmin = user?.role === "admin";
  
  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-[45] md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          width: collapsed ? 72 : 260,
          x: isMobileMenuOpen ? 0 : (window.innerWidth < 768 ? -260 : 0)
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 flex flex-col shadow-xl md:shadow-none`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-9 h-9 rounded-lg bg-transparent flex items-center justify-center shrink-0">
            <img src="/my-logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
              <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">PetroView</h1>
              <p className="text-[10px] text-sidebar-foreground">Gestion des Données</p>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r"
                  />
                )}
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info + controls */}
        <div className="p-2 border-t border-sidebar-border space-y-1 shrink-0">
          {!collapsed && (
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user?.email}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-sidebar-foreground capitalize">{role}</span>
              </div>
            </div>
          )}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
          >
            {darkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            {!collapsed && <span className="text-sm font-medium">{darkMode ? "Mode Clair" : "Mode Sombre"}</span>}
          </button>
          
          <button
            onClick={() => onCollapse(!collapsed)}
            className="hidden md:flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
          >
            {collapsed ? <ChevronRight className="w-5 h-5 shrink-0" /> : <ChevronLeft className="w-5 h-5 shrink-0" />}
            {!collapsed && <span className="text-sm font-medium">Réduire</span>}
          </button>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Déconnexion</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
