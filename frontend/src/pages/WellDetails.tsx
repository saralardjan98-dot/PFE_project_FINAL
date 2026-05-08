import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Upload, FileText, MapPin, Calendar, Ruler, Building2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useRef } from "react";
import api from "@/services/api";

const statusVariant: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  drilling: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-info/15 text-info border-info/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<string, string> = {
  active: "Actif",
  drilling: "Forage",
  completed: "Complété",
  inactive: "Inactif",
};

export default function WellDetails() {
  const { id } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [well, setWell] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── fetch well + files + analysis ──
  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/wells/${id}`),
      api.get(`/wells/${id}/files`),
      api.get(`/wells/${id}/analysis`),
    ])
      .then(([w, f, a]) => {
        setWell(w.data);
        setFiles(f.data);
        setAnalysis(a.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // ── upload file ──
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await api.post(`/files/upload/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setFiles(prev => [res.data, ...prev]);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erreur lors du téléversement");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ── delete file ──
  const handleDeleteFile = async (fileId: number) => {
    if (!confirm("Supprimer ce fichier ?")) return;
    try {
      await api.delete(`/files/${fileId}`);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  if (loading) return <p className="text-muted-foreground p-8">Chargement...</p>;
  if (!well) return <p className="text-muted-foreground p-8">Puits introuvable</p>;

  const infoItems = [
    { icon: MapPin,     label: "Localisation", value: `${well.latitude}°N, ${well.longitude}°E` },
    { icon: Building2,  label: "Opérateur",    value: well.operator },
    { icon: Ruler,      label: "Profondeur",   value: `${well.depth?.toLocaleString()} m` },
    { icon: Calendar,   label: "Date de Début",value: well.start_date },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/wells">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{well.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">
              {well.field} — {well.region}
            </span>
            <Badge variant="outline" className={statusVariant[well.status]}>
              {statusLabels[well.status]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {infoItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <item.icon className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Fichiers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Fichiers Associés</h3>

          {/* input caché + bouton */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".las,.csv"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            className="gap-2"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Téléversement..." : "Téléverser un Fichier"}
          </Button>
        </div>

        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucun fichier téléversé
          </p>
        ) : (
          <div className="space-y-2">
            {files.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/30 hover:bg-muted/50 transition-colors"
              >
                <Link
                  to={`/visualization?well=${well.id}&file=${file.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.file_type} • {file.size} • {file.curves?.join(", ")}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(file.uploaded_at).toLocaleDateString()}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteFile(file.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Résultats d'Analyse */}
      {analysis.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Résultats d'Analyse
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {analysis.map(a => (
              <div key={a.id} className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Porosité</p>
                  <p className="text-lg font-bold text-foreground">{a.porosity}%</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Sat. en Eau</p>
                  <p className="text-lg font-bold text-foreground">{a.water_saturation}%</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Perméabilité</p>
                  <p className="text-lg font-bold text-foreground">{a.permeability} mD</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Épaisseur Utile</p>
                  <p className="text-lg font-bold text-foreground">{a.net_pay} m</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}