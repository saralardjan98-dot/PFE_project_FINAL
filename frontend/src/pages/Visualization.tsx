import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { Download, BarChart2, Table, ZoomIn, ZoomOut, MoveUp, MoveDown, RotateCcw } from "lucide-react";
import api from "@/services/api";

interface CurveConfig {
  label: string;
  color: string;
  unit: string;
  domain: [number | string, number | string];
}

const CURVES_CONFIG: Record<string, CurveConfig> = {
  GR: { label: "Rayon Gamma", color: "hsl(142, 71%, 45%)", unit: "API", domain: [0, 150] },
  RHOB: { label: "Densité", color: "hsl(25, 95%, 53%)", unit: "g/cc", domain: [1.95, 2.95] },
  NPHI: { label: "Porosité Neutron", color: "hsl(199, 89%, 48%)", unit: "v/v", domain: [-0.05, 0.45] },
  DT: { label: "Sonique", color: "hsl(280, 65%, 60%)", unit: "μs/ft", domain: [40, 140] },
  RT: { label: "Résistivité", color: "hsl(350, 80%, 55%)", unit: "Ω·m", domain: [0.2, 2000] },
  CALI: { label: "Calibre", color: "hsl(38, 92%, 50%)", unit: "in", domain: [6, 16] },
  NPOR: { label: "Porosité Neutron", color: "hsl(199, 89%, 48%)", unit: "v/v", domain: [-0.05, 0.45] },
  PHIS: { label: "Porosité Sonique", color: "hsl(199, 89%, 48%)", unit: "v/v", domain: [-0.05, 0.45] },
};

interface PointData {
  depth: number;
  [key: string]: number | undefined;
}

interface FileCurve {
  name?: string;
  mnemonic?: string;
  unit?: string;
  description?: string;
}

interface FileInfo {
  id: number;
  name: string;
  file_type: string;
  curves?: FileCurve[] | string[];
}

export default function Visualization() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const wellId = searchParams.get("well");
  const fileId = searchParams.get("file");

  const [curveData, setCurveData] = useState<PointData[]>([]);
  const [availableCurves, setAvailableCurves] = useState<string[]>([]);
  const [selectedCurves, setSelectedCurves] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [activeTab, setActiveTab] = useState<"charts" | "data">("charts");
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);

  // ── Fetch file curves ──
  useEffect(() => {
    if (!wellId || !fileId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchCurves = async () => {
      try {
        // Reset states for the new file
        setLoading(true);
        setError(null);
        setCurveData([]);
        setSelectedCurves([]);
        setAvailableCurves([]);
        setFileInfo(null);
        setZoomRange(null);

        // ── 1. Fetch file info ──
        const fileRes = await api.get<FileInfo>(`/files/${fileId}`, { signal: controller.signal });
        const file = fileRes.data;
        setFileInfo(file);

        // ── 2. Get available curves ──
        const rawCurves = file?.curves || [];
        const curveNames = rawCurves
          .map((c: unknown) => {
            if (typeof c === "string") return c;
            const obj = c as FileCurve;
            return obj?.name || obj?.mnemonic || "";
          })
          .filter(Boolean) as string[];

        // Filter out depth keys from initial selection
        const depthKeysList = ["depth", "dept", "prof", "profondeur"];
        const validInitialCurves = curveNames.filter(name => !depthKeysList.includes(name.toLowerCase()));

        setAvailableCurves(curveNames);
        setSelectedCurves(validInitialCurves.slice(0, 3));

        // ── 3. Try to fetch curve data ──
        let data: unknown;
        try {
          const curveRes = await api.get(`/files/${fileId}/curves`, { signal: controller.signal });
          data = curveRes.data;
        } catch (e1: any) {
          if (e1.name === 'CanceledError' || e1.name === 'AbortError') return;
          
          try {
            const curveRes = await api.get(`/wells/${wellId}/files/${fileId}/curves`, { signal: controller.signal });
            data = curveRes.data;
          } catch (e2: any) {
            if (e2.name === 'CanceledError' || e2.name === 'AbortError') return;
            console.warn("No curve endpoint found, using mock data");
            data = generateMockCurveData(curveNames, 100, 1200);
          }
        }

        // ── Normalize data format ──
        let rawDataPoints: any[] = [];

        if (Array.isArray(data)) {
          rawDataPoints = data;
        } else if (data && typeof data === "object") {
          const dictData = data as Record<string, any>;
          const keys = Object.keys(dictData);
          if (keys.length > 0 && Array.isArray(dictData[keys[0]])) {
            const length = dictData[keys[0]].length;
            for (let i = 0; i < length; i++) {
              const point: Record<string, any> = {};
              for (const k of keys) {
                point[k] = dictData[k][i];
              }
              rawDataPoints.push(point);
            }
          } else if (Array.isArray(dictData.data)) {
            rawDataPoints = dictData.data;
          } else if (Array.isArray(dictData.points)) {
            rawDataPoints = dictData.points;
          }
        }

        const formattedData: PointData[] = rawDataPoints.map((point) => {
          const newPoint: PointData = { depth: 0 };
          const depthKey = Object.keys(point).find(k =>
            ["depth", "dept", "prof", "profondeur"].includes(k.toLowerCase())
          );
          
          if (depthKey) {
            newPoint.depth = Number(point[depthKey]);
          } else {
            const firstKey = Object.keys(point)[0];
            newPoint.depth = Number(point[firstKey]);
          }

          Object.keys(point).forEach(k => {
            if (k.toLowerCase() !== (depthKey || "").toLowerCase()) {
              const val = point[k];
              newPoint[k] = (val === null || val === undefined || isNaN(Number(val))) ? undefined : Number(val);
            }
          });

          return newPoint;
        }).filter(p => !isNaN(p.depth));

        if (!controller.signal.aborted) {
          if (formattedData.length > 0) {
            setCurveData(formattedData);
          } else {
            console.warn("No valid data points found in response");
            setCurveData([]);
          }
        }
      } catch (err: any) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        const msg = err?.response?.data?.detail || "Erreur lors du chargement des courbes";
        setError(msg);
        console.error("Visualization error:", err);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCurves();
    return () => controller.abort();
  }, [wellId, fileId]);

  // ── Generate mock data if API fails ──
  const generateMockCurveData = (
    curves: string[],
    points: number,
    startDepth: number
  ): PointData[] => {
    const data: PointData[] = [];
    for (let i = 0; i < points; i++) {
      const depth = startDepth + i * 0.1;
      const point: PointData = { depth };

      curves.forEach((curve) => {
        const config = CURVES_CONFIG[curve];
        if (config && typeof config.domain[0] === 'number' && typeof config.domain[1] === 'number') {
          const min = config.domain[0] as number;
          const max = config.domain[1] as number;
          point[curve] = min + Math.random() * (max - min);
        }
      });

      data.push(point);
    }
    return data;
  };

  const toggleCurve = (key: string) => {
    setSelectedCurves((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    );
  };



  // ── Depth range (full extent) ──
  const depthRange = useMemo(() => {
    if (curveData.length === 0) return [0, 100] as [number, number];
    const depths = curveData.map((d) => d.depth).sort((a, b) => a - b);
    return [depths[0], depths[depths.length - 1]] as [number, number];
  }, [curveData]);

  // ── Active view range (zoom window) ──
  const activeRange = useMemo<[number, number]>(() => {
    if (zoomRange) return zoomRange;
    return depthRange as [number, number];
  }, [zoomRange, depthRange]);

  // ── Filtered data for visible depth window ──
  const filteredData = useMemo(() => {
    const [minD, maxD] = activeRange;
    return curveData.filter(p => p.depth >= minD && p.depth <= maxD);
  }, [curveData, activeRange]);



  // ── Table columns (must be before early returns) ──
  const tableColumns = useMemo(() => {
    if (curveData.length === 0) return [];
    return Object.keys(curveData[0]);
  }, [curveData]);

  // ── Depth keys helper ──
  const depthKeys = useMemo(() => ["depth", "dept", "prof", "profondeur"], []);

  // ── Curves calculation ──
  const CURVES = useMemo(() => {
    return availableCurves
      .filter((key) => !depthKeys.includes(key.toLowerCase()))
      .map((key) => {
        const config = CURVES_CONFIG[key.toUpperCase()];
        if (config) return { key, ...config };

        // Fallback for unknown curves
        return {
          key,
          label: key,
          color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
          unit: "",
          domain: ["dataMin", "dataMax"]
        };
      });
  }, [availableCurves, depthKeys]);

  // ── Handlers & Logic ──



  // ── Handlers & Logic ──
  const handleDownload = useCallback(async () => {
    if (!fileInfo) return;
    try {
      const res = await api.get(`/files/${fileInfo.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileInfo.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      alert("Erreur lors du téléchargement");
    }
  }, [fileInfo]);

  // ── Zoom & Pan helpers ──
  const ZOOM_FACTOR = 0.25;
  const PAN_FACTOR = 0.15;

  const handleZoomIn = useCallback(() => {
    const [min, max] = activeRange;
    const windowLen = max - min;
    const center = (min + max) / 2;
    const half = (windowLen * (1 - ZOOM_FACTOR)) / 2;
    setZoomRange([Math.max(depthRange[0] as number, center - half), Math.min(depthRange[1] as number, center + half)]);
  }, [activeRange, depthRange]);

  const handleZoomOut = useCallback(() => {
    const [min, max] = activeRange;
    const windowLen = max - min;
    const center = (min + max) / 2;
    const half = (windowLen * (1 + ZOOM_FACTOR)) / 2;
    const newMin = Math.max(depthRange[0] as number, center - half);
    const newMax = Math.min(depthRange[1] as number, center + half);
    if (newMin <= (depthRange[0] as number) && newMax >= (depthRange[1] as number)) {
      setZoomRange(null);
    } else {
      setZoomRange([newMin, newMax]);
    }
  }, [activeRange, depthRange]);

  const handlePanDown = useCallback(() => {
    const [min, max] = activeRange;
    const step = (max - min) * PAN_FACTOR;
    const newMin = Math.min(min + step, (depthRange[1] as number) - (max - min));
    setZoomRange([newMin, newMin + (max - min)]);
  }, [activeRange, depthRange]);

  const handlePanUp = useCallback(() => {
    const [min, max] = activeRange;
    const step = (max - min) * PAN_FACTOR;
    const newMin = Math.max((depthRange[0] as number), min - step);
    setZoomRange([newMin, newMin + (max - min)]);
  }, [activeRange, depthRange]);

  const handleResetZoom = useCallback(() => setZoomRange(null), []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== "charts" || curveData.length === 0) return;

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        handlePanUp();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handlePanDown();
      } else if (e.key === "Escape" || e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, curveData.length, handleZoomIn, handleZoomOut, handlePanUp, handlePanDown, handleResetZoom]);

  // ── Early returns for UI states ──
  if (!wellId || !fileId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visualisation des Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Sélectionnez un fichier pour commencer</p>
        </div>
        <div className="glass-card rounded-xl p-12 text-center border-dashed border-2 border-border/50">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucun fichier sélectionné</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            Pour visualiser des logs, veuillez d'abord sélectionner un puits et un fichier dans la section dédiée.
          </p>
          <button
            onClick={() => navigate("/wells")}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition shadow-lg shadow-primary/20"
          >
            Aller aux puits
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visualisation des Logs</h1>
          <p className="text-sm text-muted-foreground">Chargement des courbes...</p>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Traitement des données...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visualisation des Logs</h1>
        </div>
        <div className="glass-card rounded-xl p-6 border-l-4 border-destructive">
          <p className="text-destructive font-semibold">❌ Erreur</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  if (!fileInfo) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visualisation des Logs</h1>
        </div>
        <div className="glass-card rounded-xl p-6 text-center">
          <p className="text-muted-foreground">Fichier introuvable ou inaccessible</p>
          <button
            onClick={() => navigate("/wells")}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            Retour aux puits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visualisation des Logs</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">
              Fichier: <strong>{fileInfo.name}</strong>
            </span>
            <span className="text-xs text-muted-foreground">
              ({fileInfo.file_type}) • {curveData.length} points • {CURVES.length} courbes
            </span>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/20 transition"
        >
          <Download className="w-4 h-4" /> Télécharger
        </button>
      </div>

      {/* Zoom & Pan toolbar — only shown on charts tab */}
      {activeTab === "charts" && curveData.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mr-1">Profondeur:</span>
          <span className="text-xs font-mono text-primary glass-card px-3 py-1 rounded-lg border border-primary/20">
            {activeRange[0].toFixed(0)} — {activeRange[1].toFixed(0)} m
          </span>
          <div className="flex items-center gap-1 ml-2">
            <button onClick={handleZoomIn}
              title="Zoom avant"
              className="p-2 rounded-lg glass-card border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/50 transition">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={handleZoomOut}
              title="Zoom arrière"
              className="p-2 rounded-lg glass-card border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/50 transition">
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-border/50 mx-1" />
            <button onClick={handlePanUp}
              title="Déplacer vers le haut (moins profond)"
              className="p-2 rounded-lg glass-card border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/50 transition">
              <MoveUp className="w-4 h-4" />
            </button>
            <button onClick={handlePanDown}
              title="Déplacer vers le bas (plus profond)"
              className="p-2 rounded-lg glass-card border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/50 transition">
              <MoveDown className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-border/50 mx-1" />
            <button onClick={handleResetZoom}
              title="Réinitialiser le zoom"
              disabled={!zoomRange}
              className="p-2 rounded-lg glass-card border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/50 transition disabled:opacity-30 disabled:cursor-not-allowed">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredData.length} pts affichés / {curveData.length} total
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass-card rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("charts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "charts"
            ? "bg-primary text-primary-foreground shadow"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <BarChart2 className="w-4 h-4" /> Visualisation Graphique
        </button>
        <button
          onClick={() => setActiveTab("data")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "data"
            ? "bg-primary text-primary-foreground shadow"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <Table className="w-4 h-4" /> Données Brutes
        </button>
      </div>

      {/* ── Raw Data Tab ── */}
      {activeTab === "data" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl overflow-hidden">
          {curveData.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">⚠️ Aucune donnée à afficher</p>
          ) : (
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-xs min-w-max">
                <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
                  <tr className="border-b border-border/50">
                    {tableColumns.map(col => (
                      <th key={col} className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {curveData.map((row, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/40 transition-colors">
                      {tableColumns.map(col => {
                        const val = row[col];
                        return (
                          <td key={col} className="px-4 py-2 font-mono text-foreground whitespace-nowrap">
                            {val === null || val === undefined ? <span className="text-muted-foreground">—</span> : typeof val === 'number' ? val.toFixed(4) : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
                {curveData.length} lignes • {tableColumns.length} colonnes
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Charts Tab ── */}
      {activeTab === "charts" && CURVES.length === 0 && (
        <div className="glass-card rounded-xl p-6 text-center">
          <p className="text-muted-foreground">❌ Aucune courbe disponible dans ce fichier</p>
          <p className="text-xs text-muted-foreground mt-2">Courbes trouvées: {availableCurves.join(", ") || "Aucune"}</p>
        </div>
      )}
      {activeTab === "charts" && CURVES.length > 0 && (
        <>
          {/* Curve selector */}
          <div className="flex flex-wrap gap-2">
            {CURVES.map((curve) => (
              <button
                key={curve.key}
                onClick={() => toggleCurve(curve.key)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${selectedCurves.includes(curve.key)
                  ? "border-transparent shadow-lg scale-105"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                style={
                  selectedCurves.includes(curve.key)
                    ? {
                      backgroundColor: curve.color,
                      color: "#fff",
                      boxShadow: `0 4px 14px ${curve.color}40`,
                    }
                    : {}
                }
              >
                {curve.key} — {curve.label} ({curve.unit})
              </button>
            ))}
          </div>

          {curveData.length === 0 ? (
            <div className="glass-card rounded-xl p-6 text-center">
              <p className="text-muted-foreground">
                ⚠️ Données non disponibles
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Le fichier a été uploadé mais les données n'ont pas pu être
                traitées.
              </p>
            </div>
          ) : (
            <>
              {/* Individual track charts */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(selectedCurves.length, 4)}, 1fr)`,
                }}
              >
                {selectedCurves.map((curveKey) => {
                  const curve = CURVES.find((c) => c.key === curveKey);
                  if (!curve) return null;
                  return (
                    <div key={curveKey} className="glass-card rounded-xl p-4">
                      {/* Track header */}
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full shadow-lg flex-shrink-0"
                          style={{ backgroundColor: curve.color, boxShadow: `0 0 8px ${curve.color}60` }}
                        />
                        <span className="text-sm font-bold text-foreground truncate">{curve.label}</span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-muted-foreground font-mono">{curve.domain[0]} — {curve.domain[1]}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: curve.color + '20', color: curve.color }}>{curve.unit}</span>
                      </div>
                      <ResponsiveContainer width="100%" height={600}>
                        <LineChart
                          data={filteredData}
                          layout="vertical"
                          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(222, 30%, 18%)"
                            opacity={0.5}
                          />
                          <XAxis
                            type="number"
                            domain={curve.domain}
                            stroke="hsl(215, 16%, 47%)"
                            fontSize={9}
                            tickCount={5}
                            tickFormatter={(v: number) =>
                              curve.key === "RT"
                                ? v.toFixed(0)
                                : v.toFixed(1)
                            }
                          />
                          <YAxis
                            dataKey="depth"
                            type="number"
                            reversed
                            domain={activeRange}
                            tickCount={8}
                            stroke="hsl(215, 16%, 47%)"
                            fontSize={9}
                            width={60}
                            label={{
                              value: "Prof. (m)",
                              angle: -90,
                              position: "insideLeft",
                              style: { fontSize: 11, fill: "hsl(215, 16%, 47%)" },
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(222, 47%, 8%)",
                              border:
                                "1px solid hsl(222, 30%, 20%)",
                              borderRadius: "10px",
                              fontSize: "11px",
                              boxShadow:
                                "0 8px 24px rgba(0,0,0,0.4)",
                            }}
                            formatter={(value: number) => [
                              `${value.toFixed(3)} ${curve.unit}`,
                              curve.label,
                            ]}
                            labelFormatter={(label) =>
                              `Profondeur : ${label} m`
                            }
                          />
                          <Line
                            dataKey={curveKey}
                            stroke={curve.color}
                            dot={false}
                            strokeWidth={1.5}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </motion.div>


            </>
          )}
        </>
      )}
    </div>
  );
}