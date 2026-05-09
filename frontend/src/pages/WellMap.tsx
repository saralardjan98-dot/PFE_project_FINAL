import { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, X, MapPin, Ruler, Building2, Layers, Droplets, ChevronRight } from "lucide-react";
import api from "@/services/api";
import "leaflet/dist/leaflet.css";

// ── Status colours & labels ──────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  active:      "#22c55e",
  drilling:    "#f97316",
  completed:   "#0ea5e9",
  inactive:    "#6b7280",
  maintenance: "#eab308",
};
const STATUS_LABEL: Record<string, string> = {
  active:      "Actif",
  drilling:    "Forage",
  completed:   "Complété",
  inactive:    "Inactif",
  maintenance: "Maintenance",
};

// ── Red Google-Maps-style pin icon ───────────────────────────────────
function makePinIcon(color: string, isSelected = false) {
  const size  = isSelected ? 40 : 32;
  const ring  = isSelected ? "3px solid #fff" : "2px solid rgba(255,255,255,0.8)";
  const glow  = isSelected ? `0 0 0 4px ${color}50, 0 4px 16px rgba(0,0,0,0.4)` : `0 2px 10px rgba(0,0,0,0.3)`;
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div style="
          width:${size}px;height:${size}px;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${color};
          border:${ring};
          box-shadow:${glow};
          transition:transform 0.15s,box-shadow 0.15s;
        "></div>
        <div style="
          width:6px;height:6px;
          background:rgba(0,0,0,0.25);
          border-radius:50%;
          margin-top:-2px;
          filter:blur(2px);
        "></div>
      </div>`,
    iconSize:   [size, size + 8],
    iconAnchor: [size / 2, size + 8],
  });
}

export default function WellMap() {
  const [wells,        setWells]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [fieldFilter,  setFieldFilter]  = useState("all");
  const [zoneFilter,   setZoneFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected,     setSelected]     = useState<any | null>(null);

  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef     = useRef<Map<number, L.Marker>>(new Map());
  const layerGroupRef  = useRef<L.LayerGroup | null>(null);
  const navigate       = useNavigate();

  // ── Fetch wells ──────────────────────────────────────────────────
  useEffect(() => {
    api.get("/wells")
      .then(res => {
        const data = Array.isArray(res.data) ? res.data
          : Array.isArray(res.data?.items) ? res.data.items : [];
        setWells(data);
      })
      .catch(err => setError(err.response?.data?.detail || "Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, []);

  // ── Init Leaflet map ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([30.5, 6.5], 6);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

    // Light clean tile (like Google Maps)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; <a href='https://carto.com/'>CARTO</a>",
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    layerGroupRef.current  = L.layerGroup().addTo(map);

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // ── Derived filter options ───────────────────────────────────────
  const fields  = useMemo(() => [...new Set(wells.map(w => w.field).filter(Boolean))],  [wells]);
  const states  = useMemo(() => [...new Set(wells.map(w => w.state || w.region).filter(Boolean))], [wells]);

  // ── Filtered wells ───────────────────────────────────────────────
  const filtered = useMemo(() => wells.filter(w => {
    const q = search.toLowerCase();
    const matchSearch  = !q || (w.name || "").toLowerCase().includes(q) || (w.api || "").toLowerCase().includes(q) || (w.state || w.location || "").toLowerCase().includes(q);
    const matchField   = fieldFilter  === "all" || w.field  === fieldFilter;
    const matchState   = zoneFilter   === "all" || w.state   === zoneFilter || w.region === zoneFilter;
    const matchStatus  = statusFilter === "all" || w.status === statusFilter;
    return matchSearch && matchField && matchState && matchStatus;
  }), [wells, search, fieldFilter, zoneFilter, statusFilter]);

  // ── Update markers on filter/selection change ────────────────────
  useEffect(() => {
    if (!layerGroupRef.current || !mapInstanceRef.current) return;

    layerGroupRef.current.clearLayers();
    markersRef.current.clear();

    filtered.forEach(well => {
      if (!well.latitude || !well.longitude) return;
      const isSelected = selected?.id === well.id || selected?.well_id === well.well_id;
      const color  = STATUS_COLOR[well.status] || "#f97316";
      const icon   = makePinIcon(color, isSelected);

      const marker = L.marker([well.latitude, well.longitude], { icon })
        .addTo(layerGroupRef.current!);

      marker.on("click", () => setSelected(well));
      markersRef.current.set(well.id, marker);
    });

    // Fit bounds to visible wells
    if (filtered.length > 0) {
      const validWells = filtered.filter(w => w.latitude && w.longitude);
      if (validWells.length > 0) {
        const bounds = L.latLngBounds(validWells.map(w => [w.latitude, w.longitude]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 8 });
      }
    }
  }, [filtered, selected]);

  // ── Pan to selected well ─────────────────────────────────────────
  useEffect(() => {
    if (selected && mapInstanceRef.current && selected.latitude && selected.longitude) {
      mapInstanceRef.current.panTo([selected.latitude, selected.longitude], { animate: true, duration: 0.5 });
    }
  }, [selected]);


  // ── Status badge counts ──────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(w => { counts[w.status] = (counts[w.status] || 0) + 1; });
    return counts;
  }, [filtered]);

  if (error) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Carte des Puits</h1>
      <div className="glass-card rounded-xl p-6 border-l-4 border-destructive">
        <p className="text-destructive font-semibold">❌ Erreur</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── TOP PANEL ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 space-y-3 pb-3">
        {/* Title row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Carte des Puits</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Chargement…" : `${filtered.length} puits affichés`}
            </p>
          </div>
          {/* Status legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(prev => prev === key ? "all" : key)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all border ${
                  statusFilter === key
                    ? "border-transparent font-bold scale-105"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                style={statusFilter === key ? { backgroundColor: STATUS_COLOR[key] + "20", color: STATUS_COLOR[key] } : {}}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[key], boxShadow: `0 0 5px ${STATUS_COLOR[key]}` }} />
                {label} {statusCounts[key] ? `(${statusCounts[key]})` : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, API ou lieu…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Field filter */}
          <Select value={fieldFilter} onValueChange={setFieldFilter}>
            <SelectTrigger className="w-40">
              <Layers className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Champ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les Champs</SelectItem>
              {fields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* State filter */}
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="État / Région" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les États</SelectItem>
              {states.map(z => <SelectItem key={String(z)} value={String(z)}>{String(z)}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* Clear filters */}
          {(search || fieldFilter !== "all" || zoneFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => { setSearch(""); setFieldFilter("all"); setZoneFilter("all"); setStatusFilter("all"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/50 transition"
            >
              <X className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* ── FULLSCREEN MAP ──────────────────────────────────────── */}
      <div className="flex-1 relative glass-card rounded-xl overflow-hidden">

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-50 rounded-xl">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
              <p className="text-sm">Chargement de la carte…</p>
            </div>
          </div>
        )}

        {/* Map container */}
        <div ref={mapRef} className="h-full w-full" />

        {/* ── Well Detail Sidebar ─────────────────────────────── */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0,   opacity: 1 }}
              exit={{   x: 340, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="absolute top-4 right-4 bottom-4 w-80 z-[1000] flex flex-col"
              style={{ pointerEvents: "all" }}
            >
              <div className="glass-card rounded-xl flex flex-col h-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl flex-shrink-0">📍</span>
                      <div className="min-w-0">
                        <h2 className="font-bold text-gray-900 truncate">{selected.name}</h2>
                        <p className="text-xs text-gray-500">API: {selected.api || "N/A"}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Status badge */}
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: (STATUS_COLOR[selected.status] || "#888") + "25", color: STATUS_COLOR[selected.status] || "#888", border: `1px solid ${STATUS_COLOR[selected.status] || "#888"}40` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[selected.status] || "#888" }} />
                      {STATUS_LABEL[selected.status] || selected.status}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {[
                    { icon: Layers,    label: "Champ",       value: selected.field || "—" },
                    { icon: Filter,    label: "État / Région",value: selected.state || selected.region || "—" },
                    { icon: Ruler,     label: "Profondeur",   value: selected.start_depth !== undefined ? `${selected.start_depth} - ${selected.stop_depth} m` : "—" },
                    { icon: Building2, label: "Compagnie",    value: selected.company || "—" },
                    { icon: MapPin,    label: "Coordonnées",  value: `${selected.latitude?.toFixed(4)}°N, ${selected.longitude?.toFixed(4)}°E` },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <item.icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-medium text-gray-800 truncate">{item.value}</p>
                      </div>
                    </div>
                  ))}

                  <div className="p-3 rounded-lg text-center bg-orange-50 border border-orange-100">
                    <Droplets className="w-5 h-5 mx-auto mb-1 text-orange-400" />
                    <p className="text-xs text-gray-500">Puits pétrolier</p>
                  </div>
                </div>

                {/* CTA */}
                <div className="p-4 border-t border-gray-100 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/wells/${selected.id || selected.well_id}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                  >
                    Voir les Détails <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Popup style overrides */}
        <style>{`
          .leaflet-control-zoom a {
            background: rgba(255,255,255,0.95) !important;
            color: #374151 !important;
            border-color: rgba(0,0,0,0.1) !important;
          }
          .leaflet-control-zoom a:hover { background: #f97316 !important; color: #fff !important; }
          .leaflet-bar { border: 1px solid rgba(0,0,0,0.1) !important; border-radius: 8px !important; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important; }
        `}</style>
      </div>
    </div>
  );
}