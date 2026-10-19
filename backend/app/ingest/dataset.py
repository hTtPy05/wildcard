import io
import re
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np


PII_PATTERNS = {
    "email": re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"),
    "phone": re.compile(r"^(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}$"),
    "ssn": re.compile(r"^\d{3}-\d{2}-\d{4}$"),
    "aadhaar": re.compile(r"^\d{4}\s\d{4}\s\d{4}$"),
}

PII_COL_KEYWORDS = ["email", "phone", "ssn", "aadhaar", "passport", "dob", "birth", "address", "first_name", "last_name", "full_name"]
LEAKAGE_KEYWORDS = ["label", "outcome", "result", "target", "copy", "ground_truth", "final_result", "after_treatment"]


def load_dataframe(file_path: Optional[str] = None, content_bytes: Optional[bytes] = None, filename: str = "") -> pd.DataFrame:
    """Loads CSV, XLSX, or TSV into a pandas DataFrame."""
    if file_path:
        if file_path.endswith(".csv") or file_path.endswith(".txt"):
            return pd.read_csv(file_path)
        elif file_path.endswith(".xlsx") or file_path.endswith(".xls"):
            return pd.read_excel(file_path)
        else:
            return pd.read_csv(file_path)
    elif content_bytes is not None:
        buf = io.BytesIO(content_bytes)
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            return pd.read_excel(buf)
        else:
            return pd.read_csv(buf)
    raise ValueError("Neither file_path nor content_bytes provided")

def profile_dataset(df: pd.DataFrame, max_sample_rows: int = 5) -> Dict[str, Any]:
    """
    Profiles a tabular dataset and returns summary stats and risk signals.
    """
    row_count, col_count = df.shape
    duplicate_rows = int(df.duplicated().sum())
    duplicate_row_pct = round((duplicate_rows / row_count * 100) if row_count > 0 else 0.0, 2)
    
    columns_profile: Dict[str, Any] = {}

    for col in df.columns:
        series = df[col]
        null_count = int(series.isna().sum())
        null_pct = round((null_count / row_count * 100) if row_count > 0 else 0.0, 2)
        unique_count = int(series.nunique())
        
        col_type = "numeric" if pd.api.types.is_numeric_dtype(series) else "categorical"
        if pd.api.types.is_datetime64_any_dtype(series):
            col_type = "datetime"
            
        stats: Dict[str, Any] = {
            "name": str(col),
            "type": col_type,
            "null_count": null_count,
            "null_pct": null_pct,
            "unique_count": unique_count,
            "sample_values": [str(v) for v in series.dropna().head(max_sample_rows).tolist()],
        }
        
        # Numeric stats
        if col_type == "numeric":
            valid_num = series.dropna()
            if not valid_num.empty:
                stats["min"] = float(valid_num.min())
                stats["max"] = float(valid_num.max())
                stats["mean"] = round(float(valid_num.mean()), 2)
                stats["median"] = round(float(valid_num.median()), 2)
                stats["std"] = round(float(valid_num.std()), 2) if len(valid_num) > 1 else 0.0
                
                # Outlier detection via IQR
                q25 = valid_num.quantile(0.25)
                q75 = valid_num.quantile(0.75)
                iqr = q75 - q25
                if iqr > 0:
                    outliers_count = int(((valid_num < (q25 - 1.5 * iqr)) | (valid_num > (q75 + 1.5 * iqr))).sum())
                    stats["outlier_count"] = outliers_count
                    stats["outlier_pct"] = round(outliers_count / len(valid_num) * 100, 2)
        
        # Categorical value counts & top frequency (for sampling bias)
        if col_type == "categorical" or unique_count <= 20:
            top_counts = series.value_counts(normalize=True).head(5).to_dict()
            stats["top_categories"] = {str(k): round(float(v) * 100, 2) for k, v in top_counts.items()}
            if top_counts:
                dominant_cat, dominant_pct = next(iter(stats["top_categories"].items()))
                stats["dominant_category"] = dominant_cat
                stats["dominant_category_pct"] = dominant_pct
                
        # Check potential PII
        col_lower = str(col).lower()
        stats["pii_signals"] = []
        if any(kw in col_lower for kw in PII_COL_KEYWORDS):
            stats["pii_signals"].append("keyword_match")
            
        # Sample value regex check for email
        if col_type == "categorical" and not series.dropna().empty:
            sample_str = str(series.dropna().iloc[0])
            if PII_PATTERNS["email"].match(sample_str):
                stats["pii_signals"].append("email_pattern")
                
        # Check potential target leakage name
        stats["leakage_signals"] = []
        if any(kw in col_lower for kw in LEAKAGE_KEYWORDS):
            stats["leakage_signals"].append("name_pattern")
            
        columns_profile[str(col)] = stats

    return {
        "row_count": row_count,
        "col_count": col_count,
        "duplicate_rows": duplicate_rows,
        "duplicate_row_pct": duplicate_row_pct,
        "columns": columns_profile,
        "summary": {
            "total_rows": row_count,
            "total_columns": col_count,
            "has_high_nulls": any(c["null_pct"] > 20 for c in columns_profile.values()),
            "has_pii": any(len(c.get("pii_signals", [])) > 0 for c in columns_profile.values()),
            "has_duplicates": duplicate_rows > 0,
        }
    }




