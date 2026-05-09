// v1.0.1 - Project Status: Stable & LAS Standardized
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Filter, ChevronRight, Droplets, Pencil, Trash2, Upload } from "lucide-react";
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
  id?: number;
  well_id?: number;
  name: string;
  api?: string;
  field?: string;
  location?: string;
  county?: string;
  state?: string;
  country?: string;
  company?: string;
  service_company?: string;
  date?: string;
  start_depth?: number;
  stop_depth?: number;
  step?: number;
  null_value?: number;
  latitude?: number;
  longitude?: number;
  status: string;
  filesCount?: number;
};

function WellDialog({
  well,
  open,
  onOpenChange,
  onSuccess
}: {
  well?: Well | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<Partial<Well>>({
    name: "", api: "", field: "", location: "", county: "", state: "", country: "",
    company: "", service_company: "", date: "", start_depth: 0, stop_depth: 0,
    step: 0, null_value: -999.25, latitude: 0, longitude: 0, status: "active",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (well && open) {
      setForm({ ...well });
    } else if (open) {
      setForm({
        name: "", api: "", field: "", location: "", county: "", state: "", country: "",
        company: "", service_company: "", date: "", start_depth: 0, stop_depth: 0,
        step: 0, null_value: -999.25, latitude: 0, longitude: 0, status: "active",
      });
    }
  }, [well, open]);

  const handleAutoFill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsParsing(true);
    try {
      const res = await api.post("/files/parse-metadata", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const metadata = res.data;
      
      setForm(prev => ({
        ...prev,
        ...metadata,
        // Ensure name is always set if WELL is found
        name: metadata.name || prev.name
      }));
      
      toast({ title: "Extraction réussie", description: "Les champs ont été auto-remplis à partir du fichier LAS." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur d'extraction",
        description: error?.response?.data?.detail || "Impossible de lire le fichier LAS",
      });
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (well) {
        await api.put(`/wells/${well.id || well.well_id}`, form);
        toast({ title: "Puits modifié", description: "Mise à jour réussie" });
      } else {
        await api.post("/wells/", form);
        toast({ title: "Puits créé", description: "Nouveau puits ajouté avec succès" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error?.response?.data?.detail || "Opération échouée",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pr-6">
          <DialogTitle>{well ? "Modifier le Puits" : "Ajouter un Nouveau Puits"}</DialogTitle>
          {!well && (
            <>
              <input type="file" accept=".las" className="hidden" ref={fileInputRef} onChange={handleAutoFill} />
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-primary border-primary/20 hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
              >
                <Upload className="w-3.5 h-3.5" />
                {isParsing ? "Analyse..." : "Auto-remplir (LAS)"}
              </Button>
            </>
          )}
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Section 1: Identification */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Identification</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Nom du Puits (WELL) *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="ex. HMD-101" />
              </div>
              <div className="grid gap-2">
                <Label>Numéro API (API)</Label>
                <Input value={form.api} onChange={e => setForm(p => ({ ...p, api: e.target.value }))} placeholder="ex. 123456789" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Champ (FLD)</Label>
                <Input value={form.field} onChange={e => setForm(p => ({ ...p, field: e.target.value }))} placeholder="ex. Hassi Messaoud" />
              </div>
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
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
          </div>

          {/* Section 2: Localisation */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Localisation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Lieu (LOC)</Label>
                <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="ex. Zone Nord" />
              </div>
              <div className="grid gap-2">
                <Label>Comté / Wilaya (CNTY)</Label>
                <Input value={form.county} onChange={e => setForm(p => ({ ...p, county: e.target.value }))} placeholder="ex. Ouargla" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>État / Région (STAT)</Label>
                <Input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="ex. Sahara" />
              </div>
              <div className="grid gap-2">
                <Label>Pays (CTRY)</Label>
                <Input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} placeholder="ex. Algérie" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Latitude (LATI)</Label>
                <Input type="number" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: +e.target.value }))} placeholder="31.68" />
              </div>
              <div className="grid gap-2">
                <Label>Longitude (LONG)</Label>
                <Input type="number" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: +e.target.value }))} placeholder="6.07" />
              </div>
            </div>
          </div>

          {/* Section 3: Opérations */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Opérations & Log</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Compagnie (COMP)</Label>
                <Input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="ex. Sonatrach" />
              </div>
              <div className="grid gap-2">
                <Label>Société de Service (SRVC)</Label>
                <Input value={form.service_company} onChange={e => setForm(p => ({ ...p, service_company: e.target.value }))} placeholder="ex. Schlumberger" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Date du Log (DATE)</Label>
              <Input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} placeholder="ex. 15/05/2024" />
            </div>
          </div>

          {/* Section 4: Paramètres Physiques */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Paramètres du Puits</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Début Log (STRT)</Label>
                <Input type="number" value={form.start_depth} onChange={e => setForm(p => ({ ...p, start_depth: +e.target.value }))} placeholder="0.0" />
              </div>
              <div className="grid gap-2">
                <Label>Fin Log (STOP)</Label>
                <Input type="number" value={form.stop_depth} onChange={e => setForm(p => ({ ...p, stop_depth: +e.target.value }))} placeholder="3500.0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Pas (STEP)</Label>
                <Input type="number" value={form.step} onChange={e => setForm(p => ({ ...p, step: +e.target.value }))} placeholder="0.1524" />
              </div>
              <div className="grid gap-2">
                <Label>Valeur Nulle (NULL)</Label>
                <Input type="number" value={form.null_value} onChange={e => setForm(p => ({ ...p, null_value: +e.target.value }))} placeholder="-999.25" />
              </div>
            </div>
          </div>

          <Button
            className="w-full mt-4"
            onClick={handleSubmit}
            disabled={!form.name || isLoading}
          >
            {isLoading ? "En cours..." : (well ? "Enregistrer les modifications" : "Créer le Puits")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [wellsList, setWellsList] = useState<Well[]>([]);
  const [wellDialog, setWellDialog] = useState<{ well: Well | null; open: boolean }>({ well: null, open: false });
  const [deletingWell, setDeletingWell] = useState<Well | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();
  const { isAdmin } = useRole();

  const fetchWells = async () => {
    try {
      const res = await api.get("/wells");
      let data = [];
      if (Array.isArray(res.data)) {
        data = res.data;
      } else if (res.data && Array.isArray(res.data.items)) {
        data = res.data.items;
      }
      setWellsList(data);
    } catch (err) {
      console.error("Erreur:", err);
      toast({ title: "Erreur", description: "Impossible de charger les puits", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchWells();
  }, []);

  const fields = [...new Set(wellsList.map(w => w.field).filter(Boolean))];

  const filtered = wellsList.filter(w => {
    const q = search.toLowerCase();
    const matchSearch =
      (w.name?.toLowerCase() || "").includes(q) ||
      (w.api?.toLowerCase() || "").includes(q) ||
      (w.field?.toLowerCase() || "").includes(q);
    const matchField = fieldFilter === "all" || w.field === fieldFilter;
    const matchStatus = statusFilter === "all" || w.status === statusFilter;
    return matchSearch && matchField && matchStatus;
  });

  const handleDelete = async () => {
    if (!deletingWell) return;
    setIsDeleting(true);
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
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Puits</h1>
          <p className="text-sm text-muted-foreground">{wellsList.length} puits enregistrés</p>
        </div>

        <Button className="gap-2" onClick={() => setWellDialog({ well: null, open: true })}>
          <Plus className="w-4 h-4" /> Ajouter un Puits
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, API, champ..."
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
            {fields.map(f => <SelectItem key={f!} value={f!}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les Statuts</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Puits (WELL)</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">API</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Champ (FLD)</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Région (STAT)</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Statut</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Fichiers</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">
                    Aucun puits trouvé
                  </td>
                </tr>
              ) : (
                filtered.map((well, i) => (
                  <motion.tr
                    key={well.id || well.well_id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Droplets className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <Link to={`/wells/${well.id || well.well_id}`} className="text-sm font-medium hover:text-primary transition-colors">
                          {well.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{well.api || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground">{well.field || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{well.state || well.location || "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className={statusVariant[well.status] || ""}>
                        {statusLabels[well.status] || well.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{well.filesCount ?? 0}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setWellDialog({ well, open: true })}
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
                        <Link to={`/wells/${well.id || well.well_id}`}>
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
        </div>
      </motion.div>

      <WellDialog
        well={wellDialog.well}
        open={wellDialog.open}
        onOpenChange={(open) => setWellDialog(p => ({ ...p, open }))}
        onSuccess={fetchWells}
      />

      <AlertDialog open={!!deletingWell} onOpenChange={() => setDeletingWell(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le puits <strong>{deletingWell?.name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}