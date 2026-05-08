import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, User, Mail, MoreHorizontal, Plus, Trash2, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { getUsers, createUser, deleteUser, updateUserRole } from "@/services/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface ProfileUser {
  id: string;
  user_id: string;
  display_name: string | null;
  role: string;
  created_at: string;
  avatar_url: string | null;
}

export default function UserManagement() {
  const [profiles, setProfiles] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<ProfileUser | null>(null);
  const [newUser, setNewUser] = useState({ email: "", password: "", displayName: "", role: "user" });
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const { user } = useAuth();

// --- 1. Fetching Data ---

const fetchProfiles = async () => {
  setLoading(true);
  try {
    const response = await getUsers();
    
    // Pour déboguer في المتصفح
    console.log("Données reçues du serveur:", response);

    /* 
       Vérification : FastAPI renvoie souvent les données directement.
       Si 'response.data' n'existe pas, on prend 'response' directement.
    */
const dataToSet = response.data || response;

if (Array.isArray(dataToSet)) {
const mapped = dataToSet.map((u: any) => ({
  id: u.id,
  user_id: u.id,
  display_name: u.full_name || u.username || "Sans nom",
  role: u.role,
  created_at: u.created_at || new Date().toISOString(),
  avatar_url: u.avatar_url || null, // ✅ لازم تضيفها
}));

  setProfiles(mapped);
} else {
  console.error("Le format des données n'est pas une liste:", dataToSet);
}

  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    toast({
      title: "Erreur",
      description: "Impossible de charger les profils utilisateurs.",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchProfiles();
  }, []);

  // --- 2. Adding a User ---
const handleAddUser = async () => {
  try {
    const dataToSend = {
      email: newUser.email,
      password: newUser.password,
      username: newUser.email.split('@')[0], // إنشاء username تلقائي
      full_name: newUser.displayName,        // تغيير الاسم ليطابق السيرفر
      role: newUser.role.toLowerCase() 
    };

    await createUser(dataToSend);
    
    toast({ title: "Succès", description: "Utilisateur ajouté !" }); // رسالة النجاح هنا
    setAddOpen(false);
    fetchProfiles();
  } catch (error: any) {
    // إظهار رسالة الخطأ الحقيقية القادمة من FastAPI
    const serverError = error.response?.data?.detail?.[0]?.msg || "Erreur de validation";
    toast({ 
      title: "Erreur", 
      description: serverError, 
      variant: "destructive" 
    });
  }
};

  // --- 3. Deleting a User ---
  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      // Send DELETE request to FastAPI backend using user ID
      await deleteUser(deletingUser.id);

      // If request is successful, update UI by filtering out the deleted user
      setProfiles(prev => prev.filter(p => p.id !== deletingUser.id));

      toast({ 
        title: "Profile Deleted", 
        description: "The user has been removed from the database.", 
        variant: "destructive" 
      });
    } catch (error: any) {
      // Error handling (e.g., server down or insufficient permissions)
      toast({ 
        title: "Error", 
        description: error.response?.data?.detail || "Impossible to delete the user.", 
        variant: "destructive" 
      });
    } finally {
      // Close the confirmation dialog in all cases
      setDeletingUser(null);
    }
  };
  const handleRoleChange = async (profile: ProfileUser, newRole: string) => {
    try {
      // 1. Send update request to FastAPI backend
      // Passing user ID and the new role (admin or user)
      await updateUserRole(profile.id, newRole);

      // 2. Update local state to reflect changes immediately in the UI
      setProfiles(prev => 
        prev.map(p => p.id === profile.id ? { ...p, role: newRole } : p)
      );

      // 3. Notify the user of success
      toast({ 
        title: "Role Updated", 
        description: `Role successfully changed to ${newRole}.`,
      });
    } catch (error: any) {
      // 4. Error handling if the API call fails
      toast({ 
        title: "Error", 
        description: error.response?.data?.detail || "Failed to update user role.", 
        variant: "destructive" 
      });
    }
  };
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Accès Restreint</h2>
          <p className="text-sm text-muted-foreground mt-1">Seuls les administrateurs peuvent accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">{profiles.length} utilisateurs enregistrés</p>
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Ajouter un Utilisateur
        </Button>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Utilisateur</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Rôle</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Date d'Inscription</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
            ) : profiles.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">Aucun utilisateur trouvé</td></tr>
            ) : (
              profiles.map((profile, i) => (
                <motion.tr
                  key={profile.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-border/30 hover:bg-muted/50 transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{profile.display_name || "Sans nom"}</p>
                        <p className="text-xs text-muted-foreground">ID: {String(profile.user_id ?? "").slice(0, 8) || "N/A"}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant="outline" className={profile.role === "admin" ? "bg-primary/15 text-primary border-primary/30" : "bg-muted text-muted-foreground"}>
                      <Shield className="w-3 h-3 mr-1" />
                      {profile.role === "admin" ? "Admin" : "Utilisateur"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">
                    {new Date(profile.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRoleChange(profile, profile.role === "admin" ? "user" : "admin")}>
                          <UserCog className="w-4 h-4 mr-2" />
                          {profile.role === "admin" ? "Passer en Utilisateur" : "Passer en Admin"}
                        </DropdownMenuItem>
                        {profile.user_id !== user?.id && (
                          <DropdownMenuItem onClick={() => setDeletingUser(profile)} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un Utilisateur</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nom d'affichage</Label>
              <Input placeholder="Nom complet" value={newUser.displayName} onChange={e => setNewUser(p => ({ ...p, displayName: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" placeholder="email@exemple.com" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Mot de passe</Label>
              <Input type="password" placeholder="Minimum 6 caractères" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Rôle</Label>
              <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button onClick={handleAddUser} disabled={!newUser.email || !newUser.password}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le profil de <strong>{deletingUser?.display_name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
