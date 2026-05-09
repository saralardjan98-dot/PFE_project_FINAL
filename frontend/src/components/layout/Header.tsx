import { useAuth } from "@/hooks/useAuth";
import { Bell, Settings, User } from "lucide-react";

export default function Header() {
    const { user } = useAuth();

    return (
        // ✅ HEADER - Fixed, non-scrollable
        <header className="flex-shrink-0 border-b border-border bg-background p-4 md:p-6">
            <div className="flex items-center justify-between">
                {/* Left - Page Title (responsive text size) */}
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-foreground">
                        PetroView
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground">
                        Gestion des données pétrolières
                    </p>
                </div>

                {/* Right - User Actions */}
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Notifications - Hide on very small screens */}
                    <button className="hidden sm:flex p-2 rounded-lg hover:bg-muted transition">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                    </button>

                    {/* Settings - Hide on very small screens */}
                    <button className="hidden sm:flex p-2 rounded-lg hover:bg-muted transition">
                        <Settings className="w-5 h-5 text-muted-foreground" />
                    </button>

                    {/* User Menu - Responsive */}
                    <div className="flex items-center gap-3 pl-3 md:pl-4 border-l border-border">
                        <div className="hidden xs:block text-right">
                            <p className="text-sm font-medium text-foreground truncate">
                                {user?.full_name || "User"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {user?.role === "admin" ? "Administrateur" : "Utilisateur"}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}