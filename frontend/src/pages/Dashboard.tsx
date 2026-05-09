import { Droplets, FileText, BarChart3, Activity, Upload, Users, FlaskConical } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatCard from "@/components/dashboard/StatCard";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import api from "@/services/api";

const STATUS_COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(25, 95%, 53%)",
  "hsl(199, 89%, 48%)",
  "hsl(215, 16%, 47%)",
];

const activityIcons = { upload: Upload, analysis: FlaskConical, well: Droplets, user: Users };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState([
    { title: "Total Puits", value: 0, subtitle: "+2 ce mois", icon: Droplets },
    { title: "Fichiers Téléversés", value: 0, subtitle: "Fichiers LAS & CSV", icon: FileText },
    { title: "Analyses Effectuées", value: 0, subtitle: "Analyses pétrophysiques", icon: BarChart3 },
    { title: "Puits Actifs", value: 0, subtitle: "En production", icon: Activity },
  ]);

  const [monthlyData, setMonthlyData] = useState([
    { month: "Jan", wells: 0, files: 0 },
    { month: "Fév", wells: 0, files: 0 },
    { month: "Mar", wells: 0, files: 0 },
    { month: "Avr", wells: 0, files: 0 },
    { month: "Mai", wells: 0, files: 0 },
    { month: "Juin", wells: 0, files: 0 },
  ]);

  const [statusData, setStatusData] = useState([
    { name: "Actif", value: 0 },
    { name: "Forage", value: 0 },
    { name: "Complété", value: 0 },
    { name: "Inactif", value: 0 },
  ]);

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/wells`),
      api.get(`/analysis`),
      api.get(`/dashboard/stats`),
    ])
      .then(([wellsRes, analysisRes, dashboardRes]) => {
        const wells = wellsRes.data || [];
        const analyses = analysisRes.data || [];

        // ── Update stats ──
        setStats([
          { title: "Total Puits", value: wells.length, subtitle: "+2 ce mois", icon: Droplets },
          { title: "Fichiers Téléversés", value: dashboardRes.data?.total_files || 0, subtitle: "Fichiers LAS & CSV", icon: FileText },
          { title: "Analyses Effectuées", value: analyses.length, subtitle: "Analyses pétrophysiques", icon: BarChart3 },
          { title: "Puits Actifs", value: wells.filter((w: any) => w.status === "active").length, subtitle: "En production", icon: Activity },
        ]);

        // ── Update status pie chart ──
        setStatusData([
          { name: "Actif", value: wells.filter((w: any) => w.status === "active").length },
          { name: "Forage", value: wells.filter((w: any) => w.status === "drilling").length },
          { name: "Complété", value: wells.filter((w: any) => w.status === "completed").length },
          { name: "Inactif", value: wells.filter((w: any) => w.status === "inactive").length },
        ]);

        // ── Build recent activity from wells + files ──
        const activities: any[] = [];
        wells.slice(0, 5).forEach(w => {
          activities.push({
            type: "well",
            action: `Nouveau puits ajouté: ${w.name}`,
            detail: `${w.field || "N/A"} - ${w.state || w.location || "N/A"}`,
            time: "Aujourd'hui",
          });
        });

        analyses.slice(0, 3).forEach(a => {
          activities.push({
            type: "analysis",
            action: `Analyse complétée`,
            detail: `Porosité: ${a.porosity}%, Sat: ${a.water_saturation}%`,
            time: "Aujourd'hui",
          });
        });

        setRecentActivity(activities.slice(0, 8));
      })
      .catch(err => {
        console.error("Erreur dashboard:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted-foreground p-8">Chargement du tableau de bord...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de Bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de la gestion des données pétrolières</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.title} {...stat} index={i} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-card rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Aperçu de l'Activité</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="wellsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="filesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
              <XAxis dataKey="month" stroke="hsl(215, 16%, 47%)" fontSize={12} />
              <YAxis stroke="hsl(215, 16%, 47%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#000",
                }}
              />
              <Area type="monotone" dataKey="wells" stroke="hsl(25, 95%, 53%)" fill="url(#wellsGrad)" strokeWidth={2} name="Puits" />
              <Area type="monotone" dataKey="files" stroke="hsl(199, 89%, 48%)" fill="url(#filesGrad)" strokeWidth={2} name="Fichiers" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Statut des Puits</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {statusData.map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#000",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {statusData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[i] }} />
                <span className="text-xs text-muted-foreground">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card rounded-xl p-5"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Activité Récente</h3>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité récente</p>
          ) : (
            recentActivity.map((item, i) => {
              const Icon = activityIcons[item.type as keyof typeof activityIcons];
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.action}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}