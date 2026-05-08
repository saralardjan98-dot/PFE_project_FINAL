export interface Well {
  id: string;
  name: string;
  code: string;
  field: string;
  region: string;
  status: "active" | "inactive" | "drilling" | "completed";
  latitude: number;
  longitude: number;
  depth: number;
  operator: string;
  startDate: string;
  filesCount: number;
}

export interface WellFile {
  id: string;
  wellId: string;
  name: string;
  type: "LAS" | "CSV";
  size: string;
  uploadedAt: string;
  curves: string[];
}

export interface AnalysisResult {
  id: string;
  wellId: string;
  porosity: number;
  waterSaturation: number;
  permeability: number;
  shaleVolume: number;
  netPay: number;
  date: string;
}

export const wells: Well[] = [
  { id: "1", name: "Hassi Messaoud HMD-101", code: "HMD-101", field: "Hassi Messaoud", region: "Ouargla", status: "active", latitude: 31.68, longitude: 6.07, depth: 3450, operator: "Sonatrach", startDate: "2022-03-15", filesCount: 12 },
  { id: "2", name: "Hassi R'Mel HRM-042", code: "HRM-042", field: "Hassi R'Mel", region: "Laghouat", status: "active", latitude: 32.93, longitude: 3.27, depth: 2800, operator: "Sonatrach", startDate: "2021-08-20", filesCount: 8 },
  { id: "3", name: "In Amenas IA-015", code: "IA-015", field: "In Amenas", region: "Illizi", status: "completed", latitude: 28.05, longitude: 9.55, depth: 4100, operator: "Sonatrach/BP", startDate: "2020-01-10", filesCount: 15 },
  { id: "4", name: "Ourhoud ORD-007", code: "ORD-007", field: "Ourhoud", region: "Ouargla", status: "drilling", latitude: 31.95, longitude: 5.95, depth: 2100, operator: "Sonatrach", startDate: "2024-01-05", filesCount: 3 },
  { id: "5", name: "Bir Rebaa North BRN-023", code: "BRN-023", field: "Bir Rebaa North", region: "Ouargla", status: "active", latitude: 31.5, longitude: 6.5, depth: 3800, operator: "Sonatrach/Anadarko", startDate: "2019-06-12", filesCount: 18 },
  { id: "6", name: "Rhourde El Baguel REB-011", code: "REB-011", field: "Rhourde El Baguel", region: "Ouargla", status: "inactive", latitude: 31.8, longitude: 6.9, depth: 3200, operator: "Sonatrach", startDate: "2018-11-30", filesCount: 9 },
  { id: "7", name: "Tin Fouye TFY-003", code: "TFY-003", field: "Tin Fouye Tabankort", region: "Illizi", status: "active", latitude: 28.5, longitude: 8.2, depth: 2950, operator: "Sonatrach/Total", startDate: "2023-04-18", filesCount: 6 },
  { id: "8", name: "Alrar ALR-019", code: "ALR-019", field: "Alrar", region: "Illizi", status: "completed", latitude: 28.2, longitude: 8.8, depth: 3600, operator: "Sonatrach", startDate: "2017-09-22", filesCount: 22 },
];

export const wellFiles: WellFile[] = [
  { id: "f1", wellId: "1", name: "HMD101_GR_RHOB.las", type: "LAS", size: "2.4 Mo", uploadedAt: "2024-01-15", curves: ["GR", "RHOB", "NPHI", "DT"] },
  { id: "f2", wellId: "1", name: "HMD101_resistivity.las", type: "LAS", size: "1.8 Mo", uploadedAt: "2024-01-16", curves: ["RT", "RXOZ", "RXO"] },
  { id: "f3", wellId: "1", name: "HMD101_core_data.csv", type: "CSV", size: "450 Ko", uploadedAt: "2024-02-01", curves: ["POROSITY", "PERM", "SW"] },
  { id: "f4", wellId: "2", name: "HRM042_composite.las", type: "LAS", size: "3.1 Mo", uploadedAt: "2023-12-10", curves: ["GR", "RHOB", "NPHI", "DT", "RT"] },
  { id: "f5", wellId: "3", name: "IA015_full_suite.las", type: "LAS", size: "5.2 Mo", uploadedAt: "2023-11-20", curves: ["GR", "RHOB", "NPHI", "DT", "RT", "CALI"] },
];

export const analysisResults: AnalysisResult[] = [
  { id: "a1", wellId: "1", porosity: 18.5, waterSaturation: 25.3, permeability: 125, shaleVolume: 12.1, netPay: 45.2, date: "2024-02-15" },
  { id: "a2", wellId: "2", porosity: 15.2, waterSaturation: 30.1, permeability: 85, shaleVolume: 18.5, netPay: 38.7, date: "2024-01-20" },
  { id: "a3", wellId: "3", porosity: 22.1, waterSaturation: 18.7, permeability: 210, shaleVolume: 8.3, netPay: 62.1, date: "2024-03-01" },
  { id: "a4", wellId: "5", porosity: 20.3, waterSaturation: 22.5, permeability: 165, shaleVolume: 10.7, netPay: 51.8, date: "2024-02-28" },
  { id: "a5", wellId: "7", porosity: 16.8, waterSaturation: 28.9, permeability: 95, shaleVolume: 15.2, netPay: 42.3, date: "2024-03-10" },
  { id: "a6", wellId: "8", porosity: 19.7, waterSaturation: 21.4, permeability: 145, shaleVolume: 11.8, netPay: 55.6, date: "2024-01-05" },
];

export function generateLogData(depth: number = 3000, interval: number = 0.5) {
  const data = [];
  for (let d = 1000; d <= 1000 + depth * interval; d += interval) {
    data.push({
      depth: d,
      GR: 20 + Math.random() * 100 + (Math.sin(d / 50) * 30),
      RHOB: 2.0 + Math.random() * 0.6 + (Math.sin(d / 80) * 0.15),
      NPHI: 0.05 + Math.random() * 0.35 + (Math.cos(d / 60) * 0.08),
      DT: 55 + Math.random() * 40 + (Math.sin(d / 70) * 10),
      RT: Math.pow(10, 0.5 + Math.random() * 2.5 + (Math.sin(d / 90) * 0.5)),
      CALI: 8 + Math.random() * 4 + (Math.sin(d / 30) * 0.5),
    });
  }
  return data;
}

export const recentActivity = [
  { action: "Fichier téléversé", detail: "HMD101_GR_RHOB.las vers HMD-101", time: "Il y a 2 heures", type: "upload" as const },
  { action: "Analyse terminée", detail: "Calcul de porosité pour BRN-023", time: "Il y a 5 heures", type: "analysis" as const },
  { action: "Puits ajouté", detail: "Nouveau puits TFY-003 enregistré", time: "Il y a 1 jour", type: "well" as const },
  { action: "Fichier téléversé", detail: "HRM042_composite.las vers HRM-042", time: "Il y a 2 jours", type: "upload" as const },
  { action: "Analyse terminée", detail: "Suite pétrophysique complète pour IA-015", time: "Il y a 3 jours", type: "analysis" as const },
  { action: "Utilisateur rejoint", detail: "Ahmed B. a rejoint en tant que Géologue", time: "Il y a 4 jours", type: "user" as const },
];
