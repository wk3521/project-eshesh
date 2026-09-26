import json
import os
from pathlib import Path
import pandas as pd
from postgrest.types import ReturnMethod
from supabase import create_client
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
RESOURCES = ROOT / "backend" / "resources"
BATCH_SIZE = 1000

load_dotenv(ROOT / "frontend" / ".env.local")
load_dotenv(ROOT / "backend" / ".env")

supabase_url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
# Service-role key bypasses RLS; skills has no insert policy for anon
supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase = create_client(supabase_url, supabase_key)


def load_rows(filename):
    # O*NET files wrap the data in metadata; the records live under "row"
    with open(RESOURCES / filename) as f:
        return pd.DataFrame(json.load(f)["row"])


software_skills = load_rows("software_skills.json")
essential_skills = load_rows("essential_skills.json")
transferable_skills = load_rows("transferable_skills.json")

# Rows are occupation/skill pairs, so each skill repeats; keep one of each.
# Software uses the specific tool (e.g. "Python"); the other files have no
# workplace_example, so their skill name is element_name.
names = (
    pd.concat([
        software_skills["workplace_example"],
        essential_skills["element_name"],
        transferable_skills["element_name"],
    ])
    .dropna()
    .str.strip()
)
names = names[names != ""].drop_duplicates().tolist()

rows = [{"name": name, "is_approved": True} for name in names]

# skills.name is unique, so skip names that already exist; this makes re-runs safe
for i in range(0, len(rows), BATCH_SIZE):
    supabase.table("skills").upsert(
        rows[i:i + BATCH_SIZE],
        on_conflict="name",
        ignore_duplicates=True,
        returning=ReturnMethod.minimal,
    ).execute()

print(f"Imported {len(rows)} skills")
