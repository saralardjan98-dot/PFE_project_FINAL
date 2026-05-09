import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import { useEffect, useState, useMemo } from "react";
import { Maximize2, X, AlertCircle } from "lucide-react";
import api from "@/services/api";

const RADAR_COLORS = [
  "hsl(25, 95%, 53%)", "hsl(199, 89%, 48%)", "hsl(142, 71%, 45%)",
  "hsl(280, 65%, 60%)", "hsl(350, 80%, 55%)", "hsl(38, 92%, 50%)",
];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(222, 47%, 8%)",
  border: "1px solid hsl(222, 30%, 20%)",
  borderRadius: "10px",
  fontSize: "11px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
};

export default function Analysis() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch both wells and analysis results from the real backend API
        const [wellsRes, analysisRes] = await Promise.all([
          api.get("/wells"),
          api.get("/analysis")
        ]);

        const wells: any[] = Array.isArray(wellsRes.data) ? wellsRes.data
          : Array.isArray(wellsRes.data?.items) ? wellsRes.data.items : [];
        const analyses: any[] = Array.isArray(analysisRes.data) ? analysisRes.data : [];

        // 2. Synchronize: Map over ALL wells from the database.
        const syncedData = wells.map(well => {
          const wellId = well.id || well.well_id;
          const result = analyses.find(a => (a.well_id === wellId));
          
          return {
            id: result?.id || `well-${wellId}`,
            well_id: wellId,
            wellName: well.name || well.code || "Inconnu",
            field: well.field || "",
            zone: well.zone || well.region || "",
            porosity: result?.porosity ?? null,
            waterSaturation: result?.water_saturation ?? null,
            permeability: result?.permeability ?? null,
            shaleVolume: result?.shale_volume ?? null,
            netPay: result?.net_pay ?? null,
            hydrocarbonSat: result?.hydrocarbon_saturation ?? null,
            hasData: !!result
          };
        });

        setData(syncedData);
      } catch (error) {
        console.error("Erreur lors de la synchronisation:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Radar Data Preparation ──
  const radarData = useMemo(() => [
    { p: "Porosité (%)", ...Object.fromEntries(data.slice(0, 6).map(d => [d.wellName, d.porosity || 0])) },
    { p: "Sat. Eau (%)", ...Object.fromEntries(data.slice(0, 6).map(d => [d.wellName, d.waterSaturation || 0])) },
    { p: "K (mD/10)", ...Object.fromEntries(data.slice(0, 6).map(d => [d.wellName, (d.permeability || 0) / 10])) },
    { p: "Vol. Arg. (%)", ...Object.fromEntries(data.slice(0, 6).map(d => [d.wellName, d.shaleVolume || 0])) },
    { p: "Ép. Utile (m/3)", ...Object.fromEntries(data.slice(0, 6).map(d => [d.wellName, (d.netPay || 0) / 3])) },
  ], [data]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  const renderChart = (type: string, isFullscreen = false) => {
    const height = isFullscreen ? 500 : 320;
    // Map data for charts using 0 as fallback for visuals
    const chartData = data.map(d => ({
      ...d,
      porosity: d.porosity || 0,
      waterSaturation: d.waterSaturation || 0
    }));

    switch (type) {
      case "porosity_sw":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,18%)" opacity={0.4} />
              <XAxis dataKey="wellName" stroke="hsl(215,16%,47%)" fontSize={isFullscreen ? 12 : 10} />
              <YAxis stroke="hsl(215,16%,47%)" fontSize={isFullscreen ? 12 : 10} unit="%" />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${v}%`, n]} />
              <Legend />
              <Bar dataKey="porosity" fill="hsl(25,95%,53%)" name="Porosité (%)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="waterSaturation" fill="hsl(199,89%,48%)" name="Sat. Eau (%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "radar":
        return (
          <ResponsiveContainer width="100%" height={isFullscreen ? 520 : 420}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="hsl(222,30%,22%)" />
              <PolarAngleAxis dataKey="p" stroke="hsl(215,16%,55%)" fontSize={isFullscreen ? 13 : 11} />
              <PolarRadiusAxis stroke="hsl(215,16%,30%)" fontSize={isFullscreen ? 10 : 9} tickCount={5} />
              {data.slice(0, 6).map((d, i) => (
                <Radar key={d.wellName} name={d.wellName} dataKey={d.wellName}
                  stroke={RADAR_COLORS[i % RADAR_COLORS.length]} 
                  fill={RADAR_COLORS[i % RADAR_COLORS.length]} 
                  fillOpacity={isFullscreen ? 0.2 : 0.18} 
                  strokeWidth={isFullscreen ? 3 : 2.5} />
              ))}
              <Legend iconType="circle" wrapperStyle={{ fontSize: isFullscreen ? "13px" : "12px", paddingTop: "16px" }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const ChartContainer = ({ title, type, subtitle }: { title: string, type: string, subtitle?: string }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <button onClick={() => setFullscreenChart(type)}
          className="p-2 rounded-lg glass-card border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/50 transition"
          title="Plein écran">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
      {renderChart(type)}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Résultats d'Analyse</h1>
        <p className="text-sm text-muted-foreground">
          Dashboard synchronisé avec la base de données
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
        {data.map((d, i) => (
          <motion.div key={d.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl p-4 hover:scale-[1.03] hover:shadow-xl transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-primary truncate max-w-[80%]">{d.wellName}</p>
              {!d.hasData && (
                <div title="Aucune donnée d'analyse" className="text-orange-500">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {[
                { label: "φ", value: d.porosity !== null ? `${d.porosity}%` : "—", color: "hsl(25,95%,53%)" },
                { label: "Sw", value: d.waterSaturation !== null ? `${d.waterSaturation}%` : "—", color: "hsl(199,89%,48%)" },
                { label: "K", value: d.permeability !== null ? `${d.permeability} mD` : "—", color: "hsl(142,71%,45%)" },
              ].map(kpi => (
                <div key={kpi.label} className="flex items-center justify-between">
                  <span className="text-[11px] font-bold" style={{ color: kpi.color }}>{kpi.label}</span>
                  <span className="text-xs font-mono font-semibold text-foreground">{kpi.value}</span>
                </div>
              ))}
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
                <div className="h-full rounded-full transition-all" style={{ width: `${((d.porosity || 0) / 50) * 100}%`, background: "hsl(25,95%,53%)" }} />
              </div>
              {!d.hasData && <p className="text-[9px] text-orange-400 font-medium text-center pt-1">Analyse manquante</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Main Charts ── */}
      <div className="grid grid-cols-1 gap-6">
        <ChartContainer title="Porosité & Saturation en Eau" type="porosity_sw" />
        <ChartContainer title="Radar Multi-Puits" type="radar" subtitle="Comparaison des paramètres clés" />
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {fullscreenChart && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setFullscreenChart(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card rounded-2xl p-6 w-full max-w-5xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Aperçu Détaillé</h3>
                <button onClick={() => setFullscreenChart(null)} className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="py-4">
                {renderChart(fullscreenChart, true)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}