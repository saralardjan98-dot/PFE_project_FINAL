import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import api from "@/services/api";
import "leaflet/dist/leaflet.css";

const statusVariant: Record<string, string> = {
  active: "#22c55e",
  drilling: "#f97316",
  completed: "#0ea5e9",
  inactive: "#6b7280",
};

const statusLabels: Record<string, string> = {
  active: "Actif",
  drilling: "Forage",
  completed: "Complété",
  inactive: "Inactif",
};

export default function WellMap() {
  const [wells, setWells] = useState<any[]>([]);
  const [regionFilter, setRegionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const navigate = useNavigate();



  // ── Fetch wells ──
  useEffect(() => {
    const fetchWells = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/wells`);
        setWells(res.data || []);
      } catch (err: any) {
        const msg = err.response?.data?.detail || "Erreur lors du chargement des puits";
        setError(msg);
        console.error("Map error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWells();
  }, []);

  // ── Initialize map ──
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([30.5, 6.5], 6);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // ── Update markers when wells/filter change ──
  useEffect(() => {
    if (!markersRef.current || !mapInstanceRef.current) return;

    markersRef.current.clearLayers();

    const regions = [...new Set(wells.map((w) => w.region))];
    const filtered = wells.filter(
      (w) => regionFilter === "all" || w.region === regionFilter
    );

    filtered.forEach((well) => {
      const color = statusVariant[well.status] || "#f97316";
      
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;">
            <div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 14px ${color}90, 0 2px 10px rgba(0,0,0,0.25);cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.4)'" onmouseout="this.style.transform='scale(1)'"></div>
            <div style="position:absolute;top:-30px;left:50%;transform:translateX(-50%);background:rgba(30,41,59,0.9);color:#fff;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;pointer-events:none;backdrop-filter:blur(4px);">${well.code || well.name}</div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker(
        [well.latitude, well.longitude],
        { icon }
      ).addTo(markersRef.current!);

      marker.bindPopup(`
        <div style="min-width:220px;font-family:Inter,sans-serif;padding:4px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color};"></div>
            <h3 style="font-weight:700;font-size:14px;margin:0;color:#1e293b;">${well.name}</h3>
          </div>
          <div style="background:rgba(0,0,0,0.04);border-radius:8px;padding:10px;margin-bottom:10px;">
            <div style="font-size:11px;line-height:1.8;color:#64748b;">
              <div style="display:flex;justify-content:space-between;"><span>🏭 Champ</span><span style="color:#1e293b;font-weight:500;">${well.field || "N/A"}</span></div>
              <div style="display:flex;justify-content:space-between;"><span>📍 Région</span><span style="color:#1e293b;font-weight:500;">${well.region}</span></div>
              <div style="display:flex;justify-content:space-between;"><span>📏 Profondeur</span><span style="color:#1e293b;font-weight:500;">${(well.depth || 0).toLocaleString()} m</span></div>
              <div style="display:flex;justify-content:space-between;"><span>🔧 Opérateur</span><span style="color:#1e293b;font-weight:500;">${well.operator || "N/A"}</span></div>
              <div style="display:flex;justify-content:space-between;"><span>📊 Statut</span><span style="color:${color};font-weight:600;">${statusLabels[well.status] || well.status}</span></div>
            </div>
          </div>
          <button onclick="window.location.href='/wells/${well.id}'" style="display:block;width:100%;padding:8px;text-align:center;background:linear-gradient(135deg, #f97316, #ea580c);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            Voir les Détails →
          </button>
        </div>
      `, {
        className: "custom-popup",
        maxWidth: 280,
      });
    });

    // ── Auto zoom to bounds ──
    if (filtered.length > 0) {
      const bounds = L.latLngBounds(
        filtered.map((w) => [w.latitude, w.longitude])
      );
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 7,
      });
    }
  }, [wells, regionFilter]);

  // ── Compute stats ──
  const regions = [...new Set(wells.map((w) => w.region))];
  const filtered = wells.filter(
    (w) => regionFilter === "all" || w.region === regionFilter
  );

  const statusCounts = {
    active: filtered.filter((w) => w.status === "active").length,
    drilling: filtered.filter((w) => w.status === "drilling").length,
    completed: filtered.filter((w) => w.status === "completed").length,
    inactive: filtered.filter((w) => w.status === "inactive").length,
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Carte des Puits</h1>
        </div>
        <div className="glass-card rounded-xl p-6 border-l-4 border-destructive">
          <p className="text-destructive font-semibold">❌ Erreur</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Carte des Puits</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Chargement..." : `${filtered.length} puits affichés sur la carte`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {Object.entries(statusLabels).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: statusVariant[key],
                    boxShadow: `0 0 6px ${statusVariant[key]}60`,
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {label} ({statusCounts[key as keyof typeof statusCounts]})
                </span>
              </div>
            ))}
          </div>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrer par région" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les Régions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card rounded-xl overflow-hidden relative"
        style={{ height: "calc(100vh - 160px)" }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-50 rounded-xl">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>Chargement de la carte...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} className="rounded-xl" />
        <style>{`
          .custom-popup .leaflet-popup-content-wrapper {
            background: rgba(255, 255, 255, 0.97);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(0,0,0,0.1);
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            color: #1e293b;
          }
          .custom-popup .leaflet-popup-tip {
            background: rgba(255, 255, 255, 0.97);
            border: 1px solid rgba(0,0,0,0.1);
          }
          .custom-popup .leaflet-popup-close-button {
            color: #64748b !important;
            font-size: 18px !important;
          }
        `}</style>
      </motion.div>
    </div>
  );
}