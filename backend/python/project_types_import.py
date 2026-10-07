import json
import os
from pathlib import Path
from postgrest.types import ReturnMethod
from supabase import create_client
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
RESOURCES = ROOT / "backend" / "resources"
BATCH_SIZE = 1000

load_dotenv(ROOT / "frontend" / ".env.local")
load_dotenv(ROOT / "backend" / ".env")

supabase_url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
# Service-role key bypasses RLS; tags has no insert policy for anon
supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase = create_client(supabase_url, supabase_key)

with open(RESOURCES / "project_types.json") as f:
    names = [name.strip() for name in json.load(f)["project_types"]]
names = list(dict.fromkeys(name for name in names if name))

# tags.name may not be unique, so upsert isn't an option; skip names that
# already exist instead, which makes re-runs safe
existing = {row["name"] for row in supabase.table("tags").select("name").execute().data}
rows = [{"name": name} for name in names if name not in existing]

for i in range(0, len(rows), BATCH_SIZE):
    supabase.table("tags").insert(
        rows[i:i + BATCH_SIZE],
        returning=ReturnMethod.minimal,
    ).execute()

print(f"Imported {len(rows)} project types into tags ({len(existing)} already existed)")
