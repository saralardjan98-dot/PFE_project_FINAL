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
    """Parse LAS file and extract curves"""
    try:
        import lasio
        
        las = lasio.read(file_path)
        
        # ── Extract curves ──
        curves = []
        for curve in las.curves:
            curves.append(curve.mnemonic)
        
        # ── Extract data ──
        df = las.df()
        
        # Reset index to include depth
        data = []
        for depth, row in df.iterrows():
            point = {"depth": float(depth)}
            for curve in curves:
                try:
                    point[curve] = float(row[curve]) if pd.notna(row[curve]) else None
                except:
                    pass
            data.append(point)
        
        return {
            "curves": curves,
            "data": data,
            "total_points": len(data)
        }
    
    except Exception as e:
        print(f"LAS parsing error: {e}")
        # Fallback: return empty but valid
        return {"curves": [], "data": [], "total_points": 0}

# ─────────────────────────── CSV Parser ────────────────────────────

def parse_csv_file(file_bytes: bytes) -> Dict[str, Any]:
    """
    Parse CSV petrophysical file.
    Assumes first row = headers, first column = depth.
    Returns same structure as parse_las_file for consistency.
    """
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier CSV: {e}")

    if df.empty:
        raise ValueError("Le fichier CSV est vide")

    columns = list(df.columns)
    curves = [{"name": col, "unit": ""} for col in columns]

    # First column is assumed to be depth
    depth_col = columns[0]
    depths = df[depth_col].dropna().tolist()

    data: Dict[str, list] = {}
    for col in columns:
        data[col] = [None if pd.isna(v) else float(v) for v in df[col]]

    return {
        "well_name": None,
        "curves": curves,
        "depth_min": min(depths) if depths else None,
        "depth_max": max(depths) if depths else None,
        "data": data,
    }


# ─────────────────────────── Excel Parser ────────────────────────────

def parse_excel_file(file_bytes: bytes) -> Dict[str, Any]:
    """
    Parse Excel petrophysical file.
    Assumes first row = headers, first column = depth.
    """
    try:
        df = pd.read_excel(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier Excel: {e}")

    if df.empty:
        raise ValueError("Le fichier Excel est vide")

    columns = list(df.columns)
    curves = [{"name": col, "unit": ""} for col in columns]

    # First column is assumed to be depth
    depth_col = columns[0]
    depths = df[depth_col].dropna().tolist()

    data: Dict[str, list] = {}
    for col in columns:
        data[col] = [None if pd.isna(v) else float(v) for v in df[col]]

    return {
        "well_name": None,
        "curves": curves,
        "depth_min": min(depths) if depths else None,
        "depth_max": max(depths) if depths else None,
        "data": data,
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
    curves = [{"name": col, "unit": ""} for col in columns]

    # Find depth column
    depth_col = next((col for col in columns if col.lower() in ["depth", "dept"]), columns[0])
    depths = df[depth_col].dropna().tolist()

    data: Dict[str, list] = {}
    for col in columns:
        data[col] = [None if pd.isna(v) else float(v) for v in df[col]]

    return {
        "well_name": None,
        "curves": curves,
        "depth_min": min(depths) if depths else None,
        "depth_max": max(depths) if depths else None,
        "data": data,
    }


# ─────────────────────── Curve data endpoint ───────────────────────

def get_curve_data_from_file(
    file_path: str,
    file_type: str,
    curve_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Read a stored LAS/CSV file and return its curve data,
    optionally filtered to a single curve.
    Returns: {depth_key, curves, points: [{depth, <curve>: value, ...}]}
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Fichier introuvable: {file_path}")

    with open(file_path, "rb") as f:
        raw = f.read()

    if file_type.upper() == "LAS":
        parsed = parse_las_file(file_path)
    elif file_type.upper() == "CSV":
        parsed = parse_csv_file(raw)
    elif file_type.upper() in ["XLSX", "XLS"]:
        parsed = parse_excel_file(raw)
    elif file_type.upper() == "JSON":
        parsed = parse_json_file(raw)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    curve_defs = parsed["curves"]
    data = parsed["data"]

    if not curve_defs:
        return {"curves": [], "points": []}

    depth_key = curve_defs[0]["name"]

    # Select curves to return
    if curve_name:
        selected = [curve_name] if curve_name in data else []
    else:
        selected = [c["name"] for c in curve_defs[1:]]  # all except depth

    depths = data.get(depth_key, [])
    points = []
    for i, d in enumerate(depths):
        if d is None:
            continue
        point: Dict[str, Any] = {"depth": d}
        for cn in selected:
            vals = data.get(cn, [])
            point[cn] = vals[i] if i < len(vals) else None
        points.append(point)

    return {
        "depth_key": depth_key,
        "curves": curve_defs,
        "selected_curves": selected,
        "depth_min": parsed["depth_min"],
        "depth_max": parsed["depth_max"],
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

