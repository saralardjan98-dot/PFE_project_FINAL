import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

export default function AppLayout() {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} />
      <main className="ml-[260px] p-6 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}
