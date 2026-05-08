import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { useEffect, useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/services/api";

export default function Analysis() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    Promise.all([
      api.get(`/wells`),
      api.get(`/analysis`),
    ])
      .then(([wellsRes, analysisRes]) => {
        let wells = [];
        if (Array.isArray(wellsRes.data)) {
          wells = wellsRes.data;
        } else if (wellsRes.data && Array.isArray(wellsRes.data.items)) {
          wells = wellsRes.data.items;
        }
        const analyses = analysisRes.data;

        const merged = analyses.map((a: any) => {
          const well = wells.find((w: any) => w.id === a.well_id || w.well_id === a.well_id);
          return {
            ...a,
            wellName: well?.name || well?.code || "Inconnu",
            field: well?.field || "",
            zone: well?.zone || well?.region || "",
            status: well?.status || "",
            // map snake_case → camelCase pour les charts
            waterSaturation: a.water_saturation,
            shaleVolume: a.shale_volume,
            netPay: a.net_pay,
          };
        });

        setData(merged);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fields = useMemo(() => [...new Set(data.map(d => d.field).filter(Boolean))], [data]);
  const zones = useMemo(() => [...new Set(data.map(d => d.zone).filter(Boolean))], [data]);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchSearch = (d.wellName?.toLowerCase() || "").includes(search.toLowerCase());
      const matchField = fieldFilter === "all" || d.field === fieldFilter;
      const matchZone = zoneFilter === "all" || d.zone === zoneFilter;
      const matchStatus = statusFilter === "all" || d.status === statusFilter;
      return matchSearch && matchField && matchZone && matchStatus;
    });
  }, [data, search, fieldFilter, zoneFilter, statusFilter]);

  const radarData = [
    { property: "Porosité (%)",     ...Object.fromEntries(filteredData.map(d => [d.wellName, d.porosity])) },
    { property: "Sat. Eau (%)",     ...Object.fromEntries(filteredData.map(d => [d.wellName, d.waterSaturation])) },
    { property: "Perm. (mD/10)",    ...Object.fromEntries(filteredData.map(d => [d.wellName, d.permeability / 10])) },
    { property: "Vol. Argile (%)",  ...Object.fromEntries(filteredData.map(d => [d.wellName, d.shaleVolume])) },
    { property: "Ép. Utile (m/3)",  ...Object.fromEntries(filteredData.map(d => [d.wellName, d.netPay / 3])) },
  ];

  const radarColors = [
    "hsl(25, 95%, 53%)", "hsl(199, 89%, 48%)", "hsl(142, 71%, 45%)",
    "hsl(280, 65%, 60%)", "hsl(350, 80%, 55%)", "hsl(38, 92%, 50%)",
  ];

  if (loading) return <p className="text-muted-foreground p-8">Chargement...</p>;
  if (data.length === 0) return <p className="text-muted-foreground p-8">Aucun résultat d'analyse trouvé</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Résultats d'Analyse</h1>
        <p className="text-sm text-muted-foreground">
          Comparaison des analyses pétrophysiques entre {filteredData.length} puits
        </p>
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom..."
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {filteredData.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-xl p-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
          >
            <p className="text-xs font-bold text-primary mb-2">{d.wellName}</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">φ</span>
                <span className="text-xs font-mono font-semibold text-foreground">{d.porosity}%</span>
              </div>
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(d.porosity / 30) * 100}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Sw</span>
                <span className="text-xs font-mono font-semibold text-foreground">{d.waterSaturation}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">K</span>
                <span className="text-xs font-mono font-semibold text-foreground">{d.permeability} mD</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-5"
        >
          <h3 className="text-sm font-bold text-foreground mb-4">
            Comparaison Porosité & Saturation en Eau
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" opacity={0.5} />
              <XAxis dataKey="wellName" stroke="hsl(215, 16%, 47%)" fontSize={11} />
              <YAxis stroke="hsl(215, 16%, 47%)" fontSize={11} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 47%, 8%)",
                  border: "1px solid hsl(222, 30%, 20%)",
                  borderRadius: "10px",
                  fontSize: "11px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />
              <Legend />
              <Bar dataKey="porosity"        fill="hsl(25, 95%, 53%)"  name="Porosité (%)"  radius={[6, 6, 0, 0]} />
              <Bar dataKey="waterSaturation" fill="hsl(199, 89%, 48%)" name="Sat. Eau (%)"  radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-xl p-5"
        >
          <h3 className="text-sm font-bold text-foreground mb-4">Radar Multi-Puits</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(222, 30%, 18%)" />
              <PolarAngleAxis dataKey="property" stroke="hsl(215, 16%, 47%)" fontSize={9} />
              <PolarRadiusAxis stroke="hsl(215, 16%, 47%)" fontSize={8} />
              {filteredData.slice(0, 4).map((d, i) => (
                <Radar
                  key={d.wellName}
                  name={d.wellName}
                  dataKey={d.wellName}
                  stroke={radarColors[i]}
                  fill={radarColors[i]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}