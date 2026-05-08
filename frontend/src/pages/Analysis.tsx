import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { useEffect, useState } from "react";
import api from "@/services/api";

export default function Analysis() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/wells`),
      api.get(`/analysis`),
    ])
      .then(([wellsRes, analysisRes]) => {
        const wells = wellsRes.data;
        const analyses = analysisRes.data;

        const merged = analyses.map((a: any) => {
          const well = wells.find((w: any) => w.id === a.well_id);
          return {
            ...a,
            wellName: well?.code || "Inconnu",
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

  const radarData = [
    { property: "Porosité (%)",     ...Object.fromEntries(data.map(d => [d.wellName, d.porosity])) },
    { property: "Sat. Eau (%)",     ...Object.fromEntries(data.map(d => [d.wellName, d.waterSaturation])) },
    { property: "Perm. (mD/10)",    ...Object.fromEntries(data.map(d => [d.wellName, d.permeability / 10])) },
    { property: "Vol. Argile (%)",  ...Object.fromEntries(data.map(d => [d.wellName, d.shaleVolume])) },
    { property: "Ép. Utile (m/3)",  ...Object.fromEntries(data.map(d => [d.wellName, d.netPay / 3])) },
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
          Comparaison des analyses pétrophysiques entre {data.length} puits
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {data.map((d, i) => (
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
            <BarChart data={data} barGap={4}>
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
              {data.slice(0, 4).map((d, i) => (
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