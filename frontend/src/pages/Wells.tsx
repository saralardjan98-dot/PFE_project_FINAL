import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Filter, ChevronRight, Droplets, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import api from "@/services/api";
import { createWell } from "@/services/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Well = {
  well_id: string;
  id?: string;
  name: string;
  code: string;
  field: string;
  zone?: string;
  region?: string;
  status: string;
  total_depth_m: number;
  depth?: number;
  operator?: string;
  filesCount?: number;
};

const statusVariant: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  drilling: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-info/15 text-info border-info/30",
  inactive: "bg-muted text-muted-foreground border-border",
  maintenance: "bg-warning/15 text-warning border-warning/30",
};

const statusLabels: Record<string, string> = {
  active: "Actif",
  drilling: "Forage",
  completed: "Complété",
  inactive: "Inactif",
  maintenance: "Maintenance",
};

export default function Wells() {
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [wellsList, setWellsList] = useState<Well[]>([]);
  const [editingWell, setEditingWell] = useState<Well | null>(null);
  const [deletingWell, setDeletingWell] = useState<Well | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", code: "", field: "", region: "", depth: 0, status: "active" as string,
  });
  const [addForm, setAddForm] = useState({
    name: "", code: "", field: "",
    latitude: 0, longitude: 0,
    region: "", depth: 0, operator: "", status: "active",
  });
  const [addOpen, setAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const { isAdmin } = useRole();

  // ── جلب قائمة الپوئيات ──
  useEffect(() => {
    api.get("/wells")
      .then(res => {
        let data = [];
        if (Array.isArray(res.data)) {
          data = res.data;
        } else if (res.data && Array.isArray(res.data.items)) {
          data = res.data.items;
        }
        setWellsList(data);
      })
      .catch(err => {
        console.error("Erreur:", err);
        toast({ title: "Erreur", description: "Impossible de charger les puits", variant: "destructive" });
      });
  }, []);

  const fields = [...new Set(wellsList.map(w => w.field).filter(Boolean))];
  const zones = [...new Set(wellsList.map(w => w.zone || w.region).filter(Boolean))];

  const filtered = wellsList.filter(w => {
    const matchSearch =
      (w.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (w.code?.toLowerCase() || "").includes(search.toLowerCase());
    const matchField = fieldFilter === "all" || w.field === fieldFilter;
    const matchZone = zoneFilter === "all" || w.zone === zoneFilter || w.region === zoneFilter;
    const matchStatus = statusFilter === "all" || w.status === statusFilter;
    return matchSearch && matchField && matchZone && matchStatus;
  });

  // ── تعديل پوئي ──
  const handleEdit = (well: Well) => {
    setEditForm({
      name: well.name,
      code: well.code,
      field: well.field,
      region: well.region || well.zone || "",
      depth: well.depth || well.total_depth_m || 0,
      status: well.status,
    });
    setEditingWell(well);
  };

  const handleSaveEdit = async () => {
    if (!editingWell) return;
    setIsLoading(true);
    try {
      const res = await api.put(`/wells/${editingWell.id || editingWell.well_id}`, editForm);
      const updated = res.data;
      setWellsList(prev => prev.map(w =>
        (w.id === updated.id || w.well_id === updated.well_id) ? updated : w
      ));
      toast({ title: "Puits modifié", description: `${updated.name} mis à jour avec succès` });
      setEditingWell(null);
    } catch (err) {
      console.error("Erreur de modification:", err);
      toast({ title: "Erreur", description: "Impossible de modifier le puits", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── حذف پوئي ──
  const handleDelete = async () => {
    if (!deletingWell) return;
    setIsLoading(true);
    try {
      await api.delete(`/wells/${deletingWell.id || deletingWell.well_id}`);
      setWellsList(prev => prev.filter(w =>
        w.id !== deletingWell.id && w.well_id !== deletingWell.well_id
      ));
      toast({ title: "Puits supprimé", description: `${deletingWell.name} supprimé avec succès` });
      setDeletingWell(null);
    } catch (err) {
      console.error("Erreur de suppression:", err);
      toast({ title: "Erreur", description: "Impossible de supprimer le puits", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── إضافة پوئي ──
  const handleAdd = async () => {
    setIsLoading(true);
    try {
      await createWell({
        ...addForm,
        total_depth_m: addForm.depth,
        zone: addForm.region,
      });
      toast({ title: "Succès", description: "Le puits a été créé avec succès !" });
      setAddOpen(false);

      // تحديث القائمة
      const res = await api.get("/wells");
      let data = [];
      if (Array.isArray(res.data)) {
        data = res.data;
      } else if (res.data && Array.isArray(res.data.items)) {
        data = res.data.items;
      }
      setWellsList(data);

      // reset الفورم
      setAddForm({
        name: "", code: "", field: "",
        latitude: 0, longitude: 0,
        region: "", depth: 0, operator: "", status: "active",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error?.response?.data?.detail || "Impossible de créer le puits",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Puits</h1>
          <p className="text-sm text-muted-foreground">{wellsList.length} puits enregistrés</p>
        </div>

        {/* ── Dialog إضافة پوئي ── */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Ajouter un Puits
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajouter un Nouveau Puits</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">

              {/* Nom */}
              <div className="grid gap-2">
                <Label>Nom du Puits *</Label>
                <Input
                  placeholder="ex. Hassi Messaoud HMD-102"
                  value={addForm.name}
                  onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              {/* Code + Champ */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Code *</Label>
                  <Input
                    placeholder="ex. HMD-102"
                    value={addForm.code}
                    onChange={e => setAddForm(p => ({ ...p, code: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Champ</Label>
                  <Input
                    placeholder="ex. Hassi Messaoud"
                    value={addForm.field}
                    onChange={e => setAddForm(p => ({ ...p, field: e.target.value }))}
                  />
                </div>
              </div>

              {/* Latitude + Longitude */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Latitude *</Label>
                  <Input
                    type="number"
                    placeholder="ex. 31.68"
                    value={addForm.latitude || ""}
                    onChange={e => setAddForm(p => ({ ...p, latitude: +e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Longitude *</Label>
                  <Input
                    type="number"
                    placeholder="ex. 6.07"
                    value={addForm.longitude || ""}
                    onChange={e => setAddForm(p => ({ ...p, longitude: +e.target.value }))}
                  />
                </div>
              </div>

              {/* Région + Profondeur */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Région / Zone</Label>
                  <Input
                    placeholder="ex. Ouargla"
                    value={addForm.region}
                    onChange={e => setAddForm(p => ({ ...p, region: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Profondeur (m)</Label>
                  <Input
                    type="number"
                    placeholder="ex. 3450"
                    value={addForm.depth || ""}
                    onChange={e => setAddForm(p => ({ ...p, depth: +e.target.value }))}
                  />
                </div>
              </div>

              {/* Opérateur + Statut */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Opérateur</Label>
                  <Input
                    placeholder="ex. Sonatrach"
                    value={addForm.operator}
                    onChange={e => setAddForm(p => ({ ...p, operator: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Statut</Label>
                  <Select
                    value={addForm.status}
                    onValueChange={v => setAddForm(p => ({ ...p, status: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="drilling">Forage</SelectItem>
                      <SelectItem value="completed">Complété</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="w-full mt-2"
                onClick={handleAdd}
                disabled={!addForm.name || !addForm.code || isLoading}
              >
                {isLoading ? "En cours..." : "Créer le Puits"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des puits..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={fieldFilter} onValueChange={setFieldFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Champ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les Champs</SelectItem>
            {fields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les Zones</SelectItem>
            {zones.map(z => <SelectItem key={String(z)} value={String(z)}>{String(z)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les Statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="drilling">Forage</SelectItem>
            <SelectItem value="completed">Complété</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Tableau ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Puits</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Champ</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Région</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Statut</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Profondeur (m)</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Fichiers</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-muted-foreground">
                  Aucun puits trouvé 🚫
                </td>
              </tr>
            ) : (
              filtered.map((well, i) => (
                <motion.tr
                  key={well.well_id || well.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/30 hover:bg-muted/50 transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Droplets className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{well.name || well.code}</p>
                        <p className="text-xs text-muted-foreground">{well.operator || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-foreground">{well.field || "—"}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{well.zone || well.region || "—"}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant="outline" className={statusVariant[well.status] || ""}>
                      {statusLabels[well.status] || well.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-mono text-foreground">
                    {(well.total_depth_m || well.depth || 0).toLocaleString()} m
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{well.filesCount ?? 0}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(well)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingWell(well)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Link to={`/wells/${well.well_id || well.id}`}>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>

      {/* ── Dialog تعديل ── */}
      <Dialog open={!!editingWell} onOpenChange={() => setEditingWell(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Puits</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nom</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Code</Label>
                <Input
                  value={editForm.code}
                  onChange={e => setEditForm(p => ({ ...p, code: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Champ</Label>
                <Input
                  value={editForm.field}
                  onChange={e => setEditForm(p => ({ ...p, field: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Région</Label>
                <Input
                  value={editForm.region}
                  onChange={e => setEditForm(p => ({ ...p, region: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Profondeur (m)</Label>
                <Input
                  type="number"
                  value={editForm.depth}
                  onChange={e => setEditForm(p => ({ ...p, depth: +e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Statut</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="drilling">Forage</SelectItem>
                  <SelectItem value="completed">Complété</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWell(null)} disabled={isLoading}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={isLoading}>
              {isLoading ? "En cours..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog حذف ── */}
      <AlertDialog open={!!deletingWell} onOpenChange={() => setDeletingWell(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le puits <strong>{deletingWell?.name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}