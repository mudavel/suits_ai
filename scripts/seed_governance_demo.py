"""Populate only the simulated lawyer dashboard, preserving operational records.

Usage: python scripts/seed_governance_demo.py --database /path/to/suits.sqlite3
A consistent SQLite backup is created beside the existing database before seeding.
"""
import argparse
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
import sqlite3


DEMO_LAWYERS = [
    ("Dr. Lucas Ramos", 14200, .962, "Pinheiro & Associados Advogados"),
    ("Dra. Juliana Mendes", 12800, .940, "Carvalho, Dias & Silva Advogados"),
    ("Dr. Roberto Albuquerque", 11900, .915, "Albuquerque & Castro Sociedade"),
    ("Dra. Fernanda Vasconcelos", 10500, .884, "Vasconcelos Contencioso Bancário"),
    ("Dr. Carlos Moreira", 10600, .821, "Moreira & Guimarães Consultoria"),
]


def seed(database: Path) -> Path:
    database = database.resolve(strict=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    backup = database.with_name(f"{database.stem}.before-governance-demo-{stamp}.sqlite3")
    with closing(sqlite3.connect(database.as_uri() + "?mode=rw", uri=True, timeout=10)) as db, db:
        # Do not seed an unrelated database or silently create one after a typo.
        tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not {"cases", "decisions", "metadata"} <= tables:
            raise ValueError("O arquivo não é uma base inicializada desta aplicação.")
        with closing(sqlite3.connect(backup)) as snapshot:
            db.backup(snapshot)
        db.execute("BEGIN IMMEDIATE")
        db.execute("""CREATE TABLE IF NOT EXISTS demo_lawyer_adherence (
            name TEXT PRIMARY KEY, decisions INTEGER NOT NULL CHECK(decisions >= 0),
            adherence REAL NOT NULL CHECK(adherence BETWEEN 0 AND 1), law_firm TEXT)""")
        if "law_firm" not in {row[1] for row in db.execute("PRAGMA table_info(demo_lawyer_adherence)")}:
            db.execute("ALTER TABLE demo_lawyer_adherence ADD COLUMN law_firm TEXT")
        db.executemany("""INSERT INTO demo_lawyer_adherence (name, decisions, adherence, law_firm) VALUES (?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET decisions=excluded.decisions, adherence=excluded.adherence,
            law_firm=excluded.law_firm""",
            DEMO_LAWYERS)
    return backup


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, required=True)
    args = parser.parse_args()
    backup = seed(args.database)
    print(f"5 advogados mockados persistidos. Registros operacionais preservados. Backup: {backup}")
