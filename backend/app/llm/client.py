import os
import json
from typing import Dict, Any, List, Optional
from .prompts import SYSTEM_PROMPT, GAP_REASONING_PROMPT, PROJECT_MODEL_PROMPT, REPAIR_JSON_PROMPT
from .schemas import ProjectModelSchema, LLMAnalysisResponse


GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip()

# Path to precomputed results
PRECOMPUTED_PATH = os.path.join(os.path.dirname(__file__), "..", "samples", "precomputed_results.json")


def load_precomputed_results() -> Dict[str, Any]:
    try:
        with open(PRECOMPUTED_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load precomputed results: {e}")
        return {}


def is_demo_mode_active() -> bool:
    """Returns True if GEMINI_API_KEY is missing or explicitly set to DEMO."""
    return not GEMINI_API_KEY or GEMINI_API_KEY.lower() in ("demo", "none", "false", "")


class LLMClient:
    def __init__(self):
        self.api_key = GEMINI_API_KEY
        self.model_name = GEMINI_MODEL
        self.is_demo = is_demo_mode_active()
        self.client = None
        self._init_client()

    def _init_client(self):
        if not self.is_demo:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"Failed to initialize google-genai client, switching to Demo Mode: {e}")
                self.is_demo = True

    def extract_project_model(self, documents_text: str, project_name: str = "") -> Dict[str, Any]:
        """
        Extracts structured Project Model (goals, stakeholders, features, constraints, etc.)
        with source quotes and character offsets.
        """
        if self.is_demo or not self.client:
            # Check precomputed results
            pre = load_precomputed_results()
            for key in ["startup_prd", "student_performance", "order_fulfillment"]:
                if key in project_name.lower() or "prd" in project_name.lower():
                    return pre.get(key, {}).get("project_model", {})
            return pre.get("startup_prd", {}).get("project_model", {})

        # Live Gemini API call
        prompt = f"{PROJECT_MODEL_PROMPT}\n\nProject Name: {project_name}\n\nContent:\n{documents_text[:40000]}"
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={
                    "system_instruction": SYSTEM_PROMPT,
                    "response_mime_type": "application/json",
                    "response_schema": ProjectModelSchema,
                    "temperature": 0.2,
                }
            )
            data = json.loads(response.text)
            return data
        except Exception as e:
            print(f"Extraction failed: {e}. Retrying once with raw JSON mode...")
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt + "\n\nOutput STRICT JSON matching ProjectModelSchema.",
                    config={"temperature": 0.2}
                )
                text = response.text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                return json.loads(text)
            except Exception as e2:
                print(f"Fallback to precomputed project model due to: {e2}")
                pre = load_precomputed_results()
                return pre.get("startup_prd", {}).get("project_model", {})

    def run_gap_reasoning(
        self,
        project_name: str,
        project_model: Dict[str, Any],
        artifacts_summary: str,
        sample_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Runs LLM gap reasoning over the Project Model and artifacts.
        Returns list of findings with strict evidence citations.
        """
        if self.is_demo or not self.client:
            pre = load_precomputed_results()
            if sample_key and sample_key in pre:
                return pre[sample_key].get("findings", [])
            # Heuristic match
            p_lower = project_name.lower()
            if "prd" in p_lower or "quickbite" in p_lower or "campus" in p_lower:
                return pre.get("startup_prd", {}).get("findings", [])
            elif "student" in p_lower or "performance" in p_lower:
                return pre.get("student_performance", {}).get("findings", [])
            elif "workflow" in p_lower or "fulfillment" in p_lower or "order" in p_lower:
                return pre.get("order_fulfillment", {}).get("findings", [])
            return pre.get("startup_prd", {}).get("findings", [])

        # Live Gemini API call
        prompt = f"""{GAP_REASONING_PROMPT}

Project Name: {project_name}

Extracted Project Model:
{json.dumps(project_model, indent=2)}

Uploaded Artifacts & Profiles:
{artifacts_summary[:40000]}
"""

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={
                    "system_instruction": SYSTEM_PROMPT,
                    "response_mime_type": "application/json",
                    "response_schema": LLMAnalysisResponse,
                    "temperature": 0.3,
                }
            )
            data = json.loads(response.text)
            findings = data.get("findings", [])
            return findings
        except Exception as e:
            print(f"Gap reasoning call failed: {e}. Retrying with repair...")
            try:
                repair = REPAIR_JSON_PROMPT.format(error=str(e), original=artifacts_summary[:1000])
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=repair,
                    config={"temperature": 0.2}
                )
                text = response.text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                data = json.loads(text)
                return data.get("findings", [])
            except Exception as e2:
                print(f"Falling back to precomputed findings due to: {e2}")
                pre = load_precomputed_results()
                return pre.get("startup_prd", {}).get("findings", [])
