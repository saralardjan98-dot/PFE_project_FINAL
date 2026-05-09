"""
Service for parsing LAS and CSV petrophysical files.
Extracts curves, metadata, and numeric data for visualization.
"""
import io
import os
import math
import json
from typing import Dict, List, Optional, Tuple, Any

import pandas as pd


# ─────────────────────────── LAS Parser ────────────────────────────

def _parse_las_sections(content: str) -> Dict[str, Any]:
    """
    Parse a LAS file into sections: ~W (well info), ~C (curves), ~A (data).
    Returns a dict with well_name, curves (list of dicts), and raw_data_lines.
    """
    sections: Dict[str, list] = {}
    current = None

    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("~"):
            # Section header e.g. ~W, ~C, ~A, ~V
            current = stripped[1].upper()
            sections.setdefault(current, [])
        elif current is not None:
            sections[current].append(stripped)

    result: Dict[str, Any] = {
        "well_name": None,
        "curves": [],
        "raw_data_lines": sections.get("A", []),
        "version": None,
    }

    # Parse well info (~W)
    for line in sections.get("W", []):
        if "." in line:
            mnemonic = line.split(".")[0].strip().upper()
            rest = line.split(".", 1)[1]
            # value is between units and the colon description
            parts = rest.split(":", 1)
            value_unit = parts[0].strip()
            # The first "word" of value_unit is the unit, the rest is the value
            tokens = value_unit.split()
            value = tokens[-1] if tokens else ""
            if mnemonic == "WELL":
                result["well_name"] = value or None

    # Parse curve info (~C)
    for line in sections.get("C", []):
        if "." in line:
            mnemonic = line.split(".")[0].strip().upper()
            rest = line.split(".", 1)[1]
            unit_and_desc = rest.split(":", 1)
            unit = unit_and_desc[0].strip().split()[0] if unit_and_desc[0].strip() else ""
            desc = unit_and_desc[1].strip() if len(unit_and_desc) > 1 else ""
            result["curves"].append({"name": mnemonic, "unit": unit, "description": desc})

    return result


def parse_las_file(file_path: str) -> dict:
    """Parse LAS file and extract curves and metadata"""
    try:
        import lasio
        
        las = lasio.read(file_path)
        
        # ── Extract metadata ──
        metadata = {}
        mapping = {
            "WELL": "name",
            "API": "api",
            "FLD": "field",
            "LOC": "location",
            "CNTY": "county",
            "STAT": "state",
            "CTRY": "country",
            "COMP": "company",
            "SRVC": "service_company",
            "DATE": "date",
            "STRT": "start_depth",
            "STOP": "stop_depth",
            "STEP": "step",
            "NULL": "null_value",
            "LATI": "latitude",
            "LONG": "longitude",
        }
        
        for mnemonic, field_name in mapping.items():
            if mnemonic in las.well:
                val = las.well[mnemonic].value
                # Try to convert numeric fields
                if field_name in ["start_depth", "stop_depth", "step", "null_value", "latitude", "longitude"]:
                    try:
                        metadata[field_name] = float(val)
                    except:
                        metadata[field_name] = None
                else:
                    metadata[field_name] = str(val) if val is not None else None

        # ── Extract curves ──
        curves = []
        for curve in las.curves:
            curves.append({
                "mnemonic": curve.mnemonic,
                "unit": curve.unit,
                "description": curve.descr,
                "value": "" # placeholder if needed
            })
        
        # ── Extract data ──
        df = las.df()
        
        # Reset index to include depth (usually the index in lasio)
        # Handle cases where depth might not be the index
        data = []
        curve_mnemonics = [c["mnemonic"] for c in curves]
        
        # las.df() returns a dataframe with mnemonics as columns
        # The index is usually the first curve (depth)
        depth_mnemonic = las.curves[0].mnemonic
        
        for depth, row in df.iterrows():
            point = {"depth": float(depth)}
            for m in curve_mnemonics:
                if m == depth_mnemonic: continue
                try:
                    val = row[m]
                    point[m] = float(val) if pd.notna(val) else None
                except:
                    point[m] = None
            data.append(point)
        
        return {
            "metadata": metadata,
            "curves": curves,
            "curve_mnemonics": curve_mnemonics,
            "data": data,
            "total_points": len(data),
            "depth_range": {
                "min": float(las.well.STRT.value) if "STRT" in las.well else None,
                "max": float(las.well.STOP.value) if "STOP" in las.well else None,
                "step": float(las.well.STEP.value) if "STEP" in las.well else None,
            }
        }
    
    except Exception as e:
        print(f"LAS parsing error: {e}")
        return {"metadata": {}, "curves": [], "data": [], "total_points": 0}

# ─────────────────────────── CSV Parser ────────────────────────────

# ─────────────────────────── CSV Parser ────────────────────────────

def parse_csv_file(file_bytes: bytes) -> Dict[str, Any]:
    """
    Parse CSV petrophysical file.
    """
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier CSV: {e}")

    if df.empty:
        raise ValueError("Le fichier CSV est vide")

    columns = list(df.columns)
    # Find depth column
    depth_col = next((col for col in columns if col.lower() in ["depth", "dept", "prof", "profondeur"]), columns[0])
    
    curves = []
    for col in columns:
        curves.append({"mnemonic": col, "unit": "", "description": ""})

    data = []
    for _, row in df.iterrows():
        point = {"depth": float(row[depth_col]) if pd.notna(row[depth_col]) else 0}
        for col in columns:
            if col == depth_col: continue
            val = row[col]
            point[col] = float(val) if pd.notna(val) else None
        data.append(point)

    depths = [p["depth"] for p in data]

    return {
        "metadata": {},
        "curves": curves,
        "data": data,
        "depth_min": min(depths) if depths else None,
        "depth_max": max(depths) if depths else None,
    }


# ─────────────────────────── Excel Parser ────────────────────────────

def parse_excel_file(file_bytes: bytes) -> Dict[str, Any]:
    """
    Parse Excel petrophysical file.
    """
    try:
        df = pd.read_excel(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier Excel: {e}")

    if df.empty:
        raise ValueError("Le fichier Excel est vide")

    columns = list(df.columns)
    depth_col = next((col for col in columns if col.lower() in ["depth", "dept", "prof", "profondeur"]), columns[0])
    
    curves = [{"mnemonic": col, "unit": "", "description": ""} for col in columns]

    data = []
    for _, row in df.iterrows():
        point = {"depth": float(row[depth_col]) if pd.notna(row[depth_col]) else 0}
        for col in columns:
            if col == depth_col: continue
            val = row[col]
            point[col] = float(val) if pd.notna(val) else None
        data.append(point)

    depths = [p["depth"] for p in data]

    return {
        "metadata": {},
        "curves": curves,
        "data": data,
        "depth_min": min(depths) if depths else None,
        "depth_max": max(depths) if depths else None,
    }


# ─────────────────────────── JSON Parser ────────────────────────────

def parse_json_file(file_bytes: bytes) -> Dict[str, Any]:
    """
    Parse JSON petrophysical file.
    """
    try:
        raw_json = json.loads(file_bytes.decode('utf-8'))
        if isinstance(raw_json, list):
            df = pd.DataFrame(raw_json)
        elif isinstance(raw_json, dict) and "data" in raw_json:
            df = pd.DataFrame(raw_json["data"])
        else:
            df = pd.DataFrame([raw_json])
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier JSON: {e}")

    if df.empty:
        raise ValueError("Le fichier JSON est vide")

    columns = list(df.columns)
    depth_col = next((col for col in columns if col.lower() in ["depth", "dept", "prof", "profondeur"]), columns[0])
    
    curves = [{"mnemonic": col, "unit": "", "description": ""} for col in columns]

    data = []
    for _, row in df.iterrows():
        point = {"depth": float(row[depth_col]) if pd.notna(row[depth_col]) else 0}
        for col in columns:
            if col == depth_col: continue
            val = row[col]
            point[col] = float(val) if pd.notna(val) else None
        data.append(point)

    depths = [p["depth"] for p in data]

    return {
        "metadata": {},
        "curves": curves,
        "data": data,
        "depth_min": min(depths) if depths else None,
        "depth_max": max(depths) if depths else None,
    }


# ─────────────────────── Curve data endpoint ───────────────────────

def get_curve_data_from_file(
    file_path: str,
    file_type: str,
    curve_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Read a stored LAS/CSV file and return its curve data.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Fichier introuvable: {file_path}")

    parsed = parse_file(file_path, file_type.lower())
    if "error" in parsed:
        return {"curves": [], "points": [], "error": parsed["error"]}

    curve_defs = parsed["curves"]
    points = parsed["data"]

    if not curve_defs:
        return {"curves": [], "points": []}

    # Depth key is usually the first mnemonic or 'depth'
    depth_key = "depth"

    # Select curves to return
    if curve_name:
        # Check if the curve exists in the data points
        selected = [curve_name] if points and curve_name in points[0] else []
    else:
        # All except depth
        selected = [c["mnemonic"] for c in curve_defs if c["mnemonic"].lower() not in ["depth", "dept", "prof", "profondeur"]]

    # Calculate min/max if not provided
    depths = [p["depth"] for p in points]
    depth_min = parsed.get("depth_min") or (min(depths) if depths else 0)
    depth_max = parsed.get("depth_max") or (max(depths) if depths else 0)

    return {
        "depth_key": depth_key,
        "curves": curve_defs,
        "selected_curves": selected,
        "depth_min": depth_min,
        "depth_max": depth_max,
        "points": points,
    }


# ─────────────────────── Utility ───────────────────────

def human_readable_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / 1024 ** 2:.1f} MB"

def parse_file(file_path: str, file_type: str) -> dict:
    """Parse a LAS or CSV file based on file_type extension"""
    try:
        if file_type.lower() == "las":
            return parse_las_file(file_path)
        elif file_type.lower() == "csv":
            with open(file_path, "rb") as f:
                return parse_csv_file(f.read())
        elif file_type.lower() in ["xlsx", "xls"]:
            with open(file_path, "rb") as f:
                return parse_excel_file(f.read())
        elif file_type.lower() == "json":
            with open(file_path, "rb") as f:
                return parse_json_file(f.read())
        else:
            return {"error": f"Unsupported file type: {file_type}"}
    except Exception as e:
        return {"error": str(e)}

