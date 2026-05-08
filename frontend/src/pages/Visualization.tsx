import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
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

  // ── Fetch file curves ──
  useEffect(() => {
    if (!wellId || !fileId) {
      setError("Well ID et File ID requis");
      setLoading(false);
      return;
    }

    const fetchCurves = async () => {
      try {
        setLoading(true);
        setError(null);

        // ── 1. Fetch file info ──
        const fileRes = await api.get<FileInfo>(`/files/${fileId}`);
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
          
        setAvailableCurves(curveNames);
        setSelectedCurves(curveNames.slice(0, 3));

        // ── 3. Try to fetch curve data ──
        let data: unknown;
        try {
          const curveRes = await api.get(`/files/${fileId}/curves`);
          data = curveRes.data;
        } catch (e1) {
          try {
            const curveRes = await api.get(`/wells/${wellId}/files/${fileId}/curves`);
            data = curveRes.data;
          } catch (e2) {
            console.warn("No curve endpoint found, using mock data");
            data = generateMockCurveData(curveNames, 100, 1200);
          }
        }

        // ── Normalize data format ──
        let formattedData: PointData[] = [];
        
        if (Array.isArray(data)) {
          // It's an array of objects
          formattedData = data as PointData[];
        } else if (data && typeof data === "object") {
          // Handle dict of lists: { "DEPTH": [1,2], "GR": [3,4] }
          const dictData = data as Record<string, unknown>;
          const keys = Object.keys(dictData);
          if (keys.length > 0 && Array.isArray(dictData[keys[0]])) {
            const length = (dictData[keys[0]] as number[]).length;
            for (let i = 0; i < length; i++) {
              const point: Record<string, number> = {};
              for (const k of keys) {
                const valArray = dictData[k] as number[];
                point[k] = valArray[i];
              }
              formattedData.push(point as PointData);
            }
          } else {
             // Fallback if data is not an array of objects or dict of arrays
             // but maybe has a nested 'data' array
             const nestedData = (data as any)?.data;
             if (Array.isArray(nestedData)) {
                formattedData = nestedData as PointData[];
             }
          }
        }

        // Ensure every point has a valid lowercase 'depth' property
        formattedData = formattedData.map(point => {
          const newPoint = { ...point };
          if (newPoint.depth === undefined || isNaN(newPoint.depth)) {
            const possibleDepth = newPoint.DEPTH ?? newPoint.DEPT ?? 0;
            newPoint.depth = Number(possibleDepth);
          } else {
            newPoint.depth = Number(newPoint.depth);
          }
          return newPoint;
        }).filter(point => !isNaN(point.depth));

        if (formattedData?.length > 0) {
          setCurveData(formattedData);
        } else {
          console.error("Curve data is empty or invalid format:", data);
          setCurveData([]);
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ||
          "Erreur lors du chargement des courbes";
        setError(msg);
        console.error("Visualization error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurves();
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

  // ── Normalize data ──
  const normalizedData = useMemo(() => {
    return curveData.map((point) => {
      const normalized: Record<string, number> = { depth: point.depth };
      selectedCurves.forEach((curveKey) => {
        const config = CURVES_CONFIG[curveKey];
        const val = point[curveKey];
        
        if (config && val !== undefined) {
          const domainMin = config.domain[0];
          const domainMax = config.domain[1];
          
          if (typeof domainMin === 'number' && typeof domainMax === 'number') {
            normalized[curveKey] = ((val - domainMin) / (domainMax - domainMin)) * 100;
          } else {
            normalized[curveKey] = val; // fallback if domain is not numeric
          }
        }
      });
      return normalized;
    });
  }, [curveData, selectedCurves]);

  // ── Depth range ──
  const depthRange = useMemo(() => {
    if (curveData.length === 0) return [0, 100];
    const depths = curveData.map((d) => d.depth).sort((a, b) => a - b);
    return [depths[0], depths[depths.length - 1]];
  }, [curveData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Visualisation des Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Chargement des courbes...
          </p>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">
              Traitement du fichier LAS/CSV...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !fileInfo) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Visualisation des Logs
          </h1>
        </div>
        <div className="glass-card rounded-xl p-6 border-l-4 border-destructive">
          <p className="text-destructive font-semibold">❌ Erreur</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error || "Fichier introuvable"}
          </p>
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

  const CURVES = availableCurves
    .filter((key) => key.toUpperCase() !== "DEPTH" && key.toUpperCase() !== "DEPT")
    .map((key) => {
      const config = CURVES_CONFIG[key];
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Visualisation des Logs
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">
            Fichier: <strong>{fileInfo.name}</strong>
          </span>
          <span className="text-xs text-muted-foreground">
            ({fileInfo.file_type}) • {curveData.length} points •{" "}
            {CURVES.length} courbes
          </span>
        </div>
      </div>

      {/* Courbes disponibles */}
      {CURVES.length === 0 ? (
        <div className="glass-card rounded-xl p-6 text-center">
          <p className="text-muted-foreground">
            ❌ Aucune courbe disponible dans ce fichier
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Courbes trouvées: {availableCurves.join(", ") || "Aucune"}
          </p>
        </div>
      ) : (
        <>
          {/* Curve selector */}
          <div className="flex flex-wrap gap-2">
            {CURVES.map((curve) => (
              <button
                key={curve.key}
                onClick={() => toggleCurve(curve.key)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                  selectedCurves.includes(curve.key)
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
                  gridTemplateColumns: `repeat(${Math.min(
                    selectedCurves.length,
                    4
                  )}, 1fr)`,
                }}
              >
                {selectedCurves.map((curveKey) => {
                  const curve = CURVES.find((c) => c.key === curveKey)!;
                  return (
                    <div key={curveKey} className="glass-card rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full shadow-lg"
                          style={{
                            backgroundColor: curve.color,
                            boxShadow: `0 0 8px ${curve.color}60`,
                          }}
                        />
                        <span className="text-sm font-bold text-foreground">
                          {curve.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {curve.domain[0]} — {curve.domain[1]} {curve.unit}
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={600}>
                        <LineChart
                          data={curveData}
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
                            domain={depthRange}
                            tickCount={6}
                            stroke="hsl(215, 16%, 47%)"
                            fontSize={9}
                            width={60}
                            label={{
                              value: "Prof. (m)",
                              angle: -90,
                              position: "insideLeft",
                              style: {
                                fontSize: 11,
                                fill: "hsl(215, 16%, 47%)",
                              },
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

              {/* Composite normalized view */}
              {selectedCurves.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-xl p-5"
                >
                  <h3 className="text-sm font-bold text-foreground mb-1">
                    Vue Composite Normalisée
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Toutes les courbes normalisées sur une échelle commune
                    (0-100%)
                  </p>
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart
                      data={normalizedData}
                      layout="vertical"
                      margin={{
                        top: 5,
                        right: 20,
                        left: 10,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(222, 30%, 18%)"
                        opacity={0.5}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        stroke="hsl(215, 16%, 47%)"
                        fontSize={10}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <YAxis
                        dataKey="depth"
                        type="number"
                        reversed
                        domain={depthRange}
                        tickCount={6}
                        stroke="hsl(215, 16%, 47%)"
                        fontSize={9}
                        width={60}
                        label={{
                          value: "Prof. (m)",
                          angle: -90,
                          position: "insideLeft",
                          style: {
                            fontSize: 11,
                            fill: "hsl(215, 16%, 47%)",
                          },
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
                        formatter={(value: number, name: string) => {
                          const curve = CURVES.find(
                            (c) => c.key === name
                          );
                          return [
                            `${value.toFixed(1)}%`,
                            curve?.label || name,
                          ];
                        }}
                        labelFormatter={(label) =>
                          `Profondeur : ${label} m`
                        }
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        formatter={(value: string) => {
                          const curve = CURVES.find(
                            (c) => c.key === value
                          );
                          return curve
                            ? `${curve.label} (${curve.unit})`
                            : value;
                        }}
                      />
                      {selectedCurves.map((curveKey) => {
                        const curve = CURVES.find(
                          (c) => c.key === curveKey
                        )!;
                        return (
                          <Line
                            key={curveKey}
                            dataKey={curveKey}
                            stroke={curve.color}
                            dot={false}
                            strokeWidth={1.5}
                            isAnimationActive={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}