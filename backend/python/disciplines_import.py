import json
import os
from pathlib import Path
from postgrest.types import ReturnMethod
from supabase import create_client
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
BATCH_SIZE = 1000

load_dotenv(ROOT / "frontend" / ".env.local")
load_dotenv(ROOT / "backend" / ".env")

supabase_url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
# Service-role key bypasses RLS; disciplines has no insert policy for anon
supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase = create_client(supabase_url, supabase_key)

# majors.json is a flat list of names, shared with the frontend
with open(ROOT / "frontend" / "resources" / "majors.json") as f:
    names = [name.strip() for name in json.load(f)]
names = list(dict.fromkeys(name for name in names if name))

# disciplines.name may not be unique, so upsert isn't an option; skip names
# that already exist instead, which makes re-runs safe
existing = {row["name"] for row in supabase.table("disciplines").select("name").execute().data}
rows = [{"name": name} for name in names if name not in existing]

for i in range(0, len(rows), BATCH_SIZE):
    supabase.table("disciplines").insert(
        rows[i:i + BATCH_SIZE],
        returning=ReturnMethod.minimal,
    ).execute()

print(f"Imported {len(rows)} majors into disciplines ({len(existing)} already existed)")
