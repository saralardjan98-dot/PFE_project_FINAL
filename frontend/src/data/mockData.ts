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

export const wells: Well[] = [];
export const wellFiles: WellFile[] = [];
export const analysisResults: AnalysisResult[] = [];

export function generateLogData(depth: number = 3000, interval: number = 0.5) {
  return [];
}

export const recentActivity: any[] = [];
