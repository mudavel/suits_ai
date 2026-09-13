import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import aiosqlite
from fastapi import HTTPException

from src.backend.schemas import (
    AnalyzeResponse, CaseCreateRequest, CaseDetail, CaseListResponse, CaseSummary,
    ChatSessionListResponse, DecisionListResponse, DecisionRequest, DecisionResponse,
    DraftListResponse, DraftResponse, DraftSummary, SubsidyPresence,
    StrategyRequest, StrategyResponse, StoredStrategyResponse,
)


def now() -> datetime:
    return datetime.now(timezone.utc)


class Store:
    def __init__(self, path: Path, data_mode: str):
        self.path = path
        self.data_mode = data_mode

    @asynccontextmanager
    async def connect(self):
        async with aiosqlite.connect(self.path, timeout=10) as connection:
            connection.row_factory = aiosqlite.Row
            await connection.execute("PRAGMA foreign_keys=ON")
            yield connection

    async def initialize(self, cases: list[CaseDetail]):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        async with self.connect() as db:
            await db.execute("PRAGMA journal_mode=WAL")
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS demo_lawyer_adherence (
                    name TEXT PRIMARY KEY, decisions INTEGER NOT NULL CHECK(decisions >= 0),
                    adherence REAL NOT NULL CHECK(adherence BETWEEN 0 AND 1), law_firm TEXT);
                CREATE TABLE IF NOT EXISTS cases (
                    id INTEGER PRIMARY KEY, case_number TEXT NOT NULL UNIQUE, uf TEXT NOT NULL,
                    status TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, payload TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS analyses (
                    id TEXT PRIMARY KEY, case_id INTEGER NOT NULL REFERENCES cases(id),
                    created_at TEXT NOT NULL, payload TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS analyses_case ON analyses(case_id, created_at DESC);
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY, case_id INTEGER NOT NULL REFERENCES cases(id));
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
                    role TEXT NOT NULL, content TEXT NOT NULL, sources TEXT NOT NULL, created_at TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS sessions_case ON sessions(case_id);
                CREATE INDEX IF NOT EXISTS messages_session ON messages(session_id, id);
                CREATE TABLE IF NOT EXISTS drafts (
                    id TEXT PRIMARY KEY, case_id INTEGER NOT NULL REFERENCES cases(id), payload TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS drafts_case ON drafts(case_id);
                CREATE TABLE IF NOT EXISTS strategies (
                    id TEXT PRIMARY KEY, case_id INTEGER NOT NULL REFERENCES cases(id),
                    created_at TEXT NOT NULL, payload TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS strategies_case ON strategies(case_id, created_at DESC);
                CREATE TABLE IF NOT EXISTS decisions (
                    id TEXT PRIMARY KEY, case_id INTEGER NOT NULL UNIQUE REFERENCES cases(id),
                    idempotency_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
                    request_payload TEXT NOT NULL, response_payload TEXT NOT NULL, analysis_payload TEXT);
            """)
            columns = await (await db.execute("PRAGMA table_info(demo_lawyer_adherence)")).fetchall()
            if "law_firm" not in {column["name"] for column in columns}:
                await db.execute("ALTER TABLE demo_lawyer_adherence ADD COLUMN law_firm TEXT")
            row = await (await db.execute("SELECT value FROM metadata WHERE key='data_mode'")).fetchone()
            if row and row["value"] != self.data_mode:
                raise ValueError("O banco pertence a outro SUITS_DATA_MODE. Use outro SUITS_DATABASE_PATH.")
            await db.execute("INSERT OR IGNORE INTO metadata VALUES ('data_mode', ?)", (self.data_mode,))
            for case in cases:
                previous = await (await db.execute("SELECT payload FROM cases WHERE id=?", (case.id,))).fetchone()
                payload = case.model_dump_json()
                if previous is None:
                    await db.execute("INSERT INTO cases (id,case_number,uf,status,payload) VALUES (?,?,?,?,?)",
                                     (case.id, case.case_number, case.uf, case.status, payload))
                elif previous["payload"] != payload:
                    await db.execute("UPDATE cases SET payload=?, uf=?, case_number=?, version=version+1 WHERE id=?",
                                     (payload, case.uf, case.case_number, case.id))
            await db.execute("""
                UPDATE cases SET status='EM_ANALISE'
                WHERE status='PENDENTE' AND EXISTS (
                    SELECT 1 FROM analyses
                    WHERE analyses.case_id=cases.id
                    AND CAST(json_extract(analyses.payload, '$.case_version') AS INTEGER)=cases.version
                )
            """)
            await db.commit()

    @staticmethod
    def case_from_row(row) -> CaseDetail:
        return CaseDetail.model_validate_json(row["payload"]).model_copy(
            update={"status": row["status"], "version": row["version"]})

    async def get_case(self, case_id: int) -> CaseDetail | None:
        async with self.connect() as db:
            row = await (await db.execute("SELECT * FROM cases WHERE id=?", (case_id,))).fetchone()
        return self.case_from_row(row) if row else None

    async def list_cases(self, *, page, page_size, status, uf) -> CaseListResponse:
        clauses, params = [], []
        if status is not None:
            clauses.append("status=?")
            params.append(status)
        if uf is not None:
            clauses.append("uf=?")
            params.append(uf.upper())
        where = " WHERE " + " AND ".join(clauses) if clauses else ""
        async with self.connect() as db:
            count = await (await db.execute("SELECT count(*) FROM cases" + where, params)).fetchone()
            rows = await (await db.execute("SELECT * FROM cases" + where + " ORDER BY id LIMIT ? OFFSET ?",
                                         [*params, page_size, (page-1)*page_size])).fetchall()
        return CaseListResponse(items=[CaseSummary.model_validate(self.case_from_row(r).model_dump()) for r in rows],
            total=count[0], total_pages=(count[0]+page_size-1)//page_size, page=page, page_size=page_size,
            data_mode=self.data_mode)

    async def create_case(self, request: CaseCreateRequest) -> CaseDetail:
        async with self.connect() as db:
            await db.execute("BEGIN IMMEDIATE")
            row = await (await db.execute("SELECT coalesce(max(id),0)+1 FROM cases")).fetchone()
            case = CaseDetail(**request.model_dump(), id=row[0], status="PENDENTE", documents=[],
                subsidies=SubsidyPresence(**{name: False for name in SubsidyPresence.model_fields}),
                data_mode="manual", is_simulated=False)
            try:
                await db.execute("INSERT INTO cases (id,case_number,uf,status,payload) VALUES (?,?,?,?,?)",
                    (case.id, case.case_number, case.uf, case.status, case.model_dump_json()))
                await db.commit()
            except aiosqlite.IntegrityError:
                raise HTTPException(409, "Número de processo já cadastrado.") from None
        return case

    async def save_analysis(self, result: AnalyzeResponse) -> AnalyzeResponse:
        result = result.model_copy(update={"analysis_id": uuid4(), "created_at": now()})
        async with self.connect() as db:
            await db.execute("BEGIN IMMEDIATE")
            row = await (await db.execute("SELECT version FROM cases WHERE id=?", (result.case_id,))).fetchone()
            if row is None or row[0] != result.case_version:
                raise HTTPException(409, "O caso mudou durante a análise. Recarregue os dados.")
            await db.execute("INSERT INTO analyses VALUES (?,?,?,?)",
                (str(result.analysis_id), result.case_id, now().isoformat(), result.model_dump_json()))
            await db.execute(
                "UPDATE cases SET status='EM_ANALISE' WHERE id=? AND status='PENDENTE'",
                (result.case_id,),
            )
            await db.commit()
        return result

    async def latest_analysis(self, case_id: int) -> AnalyzeResponse | None:
        async with self.connect() as db:
            rows = await (await db.execute("SELECT payload FROM analyses WHERE case_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1", (case_id,))).fetchone()
        return AnalyzeResponse.model_validate_json(rows[0]) if rows else None

    async def stored_strategy(self, case_id: int) -> StoredStrategyResponse:
        async with self.connect() as db:
            await db.execute("BEGIN")
            row = await (await db.execute("SELECT payload FROM strategies WHERE case_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1", (case_id,))).fetchone()
            if row is None:
                return StoredStrategyResponse(status="not_found", strategy=None)
            strategy = StrategyResponse.model_validate_json(row[0])
            case = await (await db.execute("SELECT version,status FROM cases WHERE id=?", (case_id,))).fetchone()
            analysis = await (await db.execute("SELECT id FROM analyses WHERE case_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1", (case_id,))).fetchone()
        current = case and case["status"] != "CONCLUIDO" and case["version"] == strategy.case_version and analysis and analysis[0] == str(strategy.analysis_id)
        return StoredStrategyResponse(status="available" if current else "stale", strategy=strategy)

    async def _current_analysis(self, db, case_id, analysis_id, expected_version):
        case = await (await db.execute("SELECT version,status FROM cases WHERE id=?", (case_id,))).fetchone()
        if case is None:
            raise HTTPException(404, "Caso não encontrado.")
        row = await (await db.execute("SELECT payload FROM analyses WHERE case_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1", (case_id,))).fetchone()
        analysis = AnalyzeResponse.model_validate_json(row[0]) if row else None
        if (case["status"] == "CONCLUIDO" or case["version"] != expected_version or not analysis
                or analysis.analysis_id != analysis_id or analysis.case_version != case["version"]):
            raise HTTPException(409, "O parecer ou o processo mudou. Atualize os dados e revise o encaminhamento.")
        return analysis

    async def save_strategy(self, request: StrategyRequest) -> StrategyResponse:
        async with self.connect() as db:
            await db.execute("BEGIN IMMEDIATE")
            analysis = await self._current_analysis(db, request.case_id, request.analysis_id, request.expected_case_version)
            policy = analysis.policy
            above = policy and policy.settlement_pricing and request.action == "ACORDO" and request.settlement_amount > policy.settlement_pricing.ceiling
            if policy and (request.action != policy.recommendation or above) and not request.rationale:
                raise HTTPException(422, "Justifique o encaminhamento que diverge da recomendação ou supera o teto.")
            strategy = StrategyResponse(strategy_id=uuid4(), case_id=request.case_id, case_version=request.expected_case_version,
                analysis_id=request.analysis_id, action=request.action, settlement_amount=request.settlement_amount,
                rationale=request.rationale, created_at=now())
            await db.execute("INSERT INTO strategies VALUES (?,?,?,?)", (str(strategy.strategy_id), strategy.case_id,
                strategy.created_at.isoformat(), strategy.model_dump_json()))
            await db.commit()
        return strategy

    async def _validate_strategy(self, db, case_id, strategy_id, expected_version):
        row = await (await db.execute("SELECT payload FROM strategies WHERE case_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1", (case_id,))).fetchone()
        strategy = StrategyResponse.model_validate_json(row[0]) if row else None
        if not strategy or strategy.strategy_id != strategy_id or strategy.case_version != expected_version:
            raise HTTPException(409, "O encaminhamento mudou. Atualize os dados antes de preparar ou concluir a peça.")
        analysis = await self._current_analysis(db, case_id, strategy.analysis_id, expected_version)
        return strategy, analysis

    async def strategy_context(self, case: CaseDetail, strategy_id):
        async with self.connect() as db:
            await db.execute("BEGIN")
            return await self._validate_strategy(db, case.id, strategy_id, case.version)

    async def list_sessions(self, case_id: int, *, limit: int, offset: int) -> ChatSessionListResponse:
        async with self.connect() as db:
            await db.execute("BEGIN")
            total = (await (await db.execute("SELECT count(*) FROM sessions WHERE case_id=?", (case_id,))).fetchone())[0]
            rows = await (await db.execute("""SELECT s.id AS session_id, s.case_id,
                (SELECT substr(content,1,100) FROM messages WHERE session_id=s.id AND role='user' ORDER BY id LIMIT 1) AS title,
                count(m.id) AS message_count, min(m.created_at) AS created_at, max(m.created_at) AS updated_at
                FROM sessions s JOIN messages m ON m.session_id=s.id WHERE s.case_id=?
                GROUP BY s.id ORDER BY max(m.id) DESC LIMIT ? OFFSET ?""", (case_id, limit, offset))).fetchall()
        return ChatSessionListResponse(items=[dict(row) for row in rows], total=total,
            limit=limit, offset=offset, has_more=offset + len(rows) < total)

    async def session_history(self, case_id: int, session_id) -> list[dict]:
        async with self.connect() as db:
            session = await (await db.execute("SELECT case_id FROM sessions WHERE id=?", (str(session_id),))).fetchone()
            if session is None or session[0] != case_id:
                raise HTTPException(404, "Conversa não encontrada neste caso.")
            rows = await (await db.execute("SELECT role,content,sources,created_at FROM messages WHERE session_id=? ORDER BY id DESC LIMIT 20", (str(session_id),))).fetchall()
        return [{**dict(row), "sources": json.loads(row["sources"])} for row in reversed(rows)]

    async def save_exchange(self, case_id, session_id, message, response):
        async with self.connect() as db:
            await db.execute("BEGIN IMMEDIATE")
            await db.execute("INSERT OR IGNORE INTO sessions VALUES (?,?)", (str(session_id), case_id))
            session = await (await db.execute("SELECT case_id FROM sessions WHERE id=?", (str(session_id),))).fetchone()
            if session[0] != case_id:
                raise HTTPException(409, "Conversa pertence a outro caso.")
            for role, text, sources in [("user", message, []), ("assistant", response.answer, [s.model_dump() for s in response.sources])]:
                await db.execute("INSERT INTO messages(session_id,role,content,sources,created_at) VALUES (?,?,?,?,?)",
                    (str(session_id), role, text, json.dumps(sources, ensure_ascii=False), now().isoformat()))
            await db.commit()

    async def save_draft(self, draft: DraftResponse):
        async with self.connect() as db:
            await db.execute("BEGIN IMMEDIATE")
            if draft.strategy:
                await self._validate_strategy(db, draft.case_id, draft.strategy.strategy_id, draft.case_version)
            elif draft.analysis_id:
                await self._current_analysis(db, draft.case_id, draft.analysis_id, draft.case_version)
            await db.execute("INSERT INTO drafts VALUES (?,?,?)", (str(draft.draft_id), draft.case_id, draft.model_dump_json()))
            await db.commit()

    async def get_draft(self, draft_id) -> DraftResponse:
        async with self.connect() as db:
            row = await (await db.execute("SELECT payload FROM drafts WHERE id=?", (str(draft_id),))).fetchone()
        if row is None:
            raise HTTPException(404, "Minuta não encontrada.")
        return DraftResponse.model_validate_json(row[0])

    async def list_drafts(self, case_id: int, *, limit: int, offset: int) -> DraftListResponse:
        async with self.connect() as db:
            await db.execute("BEGIN")
            total = (await (await db.execute("SELECT count(*) FROM drafts WHERE case_id=?", (case_id,))).fetchone())[0]
            rows = await (await db.execute("SELECT payload FROM drafts WHERE case_id=? ORDER BY rowid DESC LIMIT ? OFFSET ?",
                (case_id, limit, offset))).fetchall()
        return DraftListResponse(items=[DraftSummary.model_validate_json(row[0]) for row in rows],
            total=total, limit=limit, offset=offset, has_more=offset + len(rows) < total)

    async def record_decision(self, request: DecisionRequest) -> DecisionResponse:
        serialized = request.model_dump_json()
        async with self.connect() as db:
            await db.execute("BEGIN IMMEDIATE")
            existing = await (await db.execute("SELECT * FROM decisions WHERE idempotency_key=?", (str(request.idempotency_key),))).fetchone()
            if existing:
                if existing["request_payload"] != serialized:
                    raise HTTPException(409, "Chave de idempotência já usada com outros dados.")
                return DecisionResponse.model_validate_json(existing["response_payload"])
            row = await (await db.execute("SELECT * FROM cases WHERE id=?", (request.case_id,))).fetchone()
            if row is None:
                raise HTTPException(404, "Caso não encontrado.")
            if row["version"] != request.expected_case_version or row["status"] == "CONCLUIDO":
                raise HTTPException(409, "Caso já concluído ou alterado. Recarregue antes de registrar.")
            if request.draft_id:
                draft_row = await (await db.execute("SELECT payload FROM drafts WHERE id=? AND case_id=?", (str(request.draft_id), request.case_id))).fetchone()
                draft = DraftResponse.model_validate_json(draft_row[0]) if draft_row else None
                if not draft or not draft.strategy:
                    raise HTTPException(422, "Selecione uma minuta vinculada ao encaminhamento deste processo.")
                strategy, _ = await self._validate_strategy(db, request.case_id, draft.strategy.strategy_id, row["version"])
                if (request.analysis_id != strategy.analysis_id or request.action != strategy.action
                        or request.settlement_amount != strategy.settlement_amount or request.override_reason != strategy.rationale):
                    raise HTTPException(409, "A decisão deve corresponder ao encaminhamento da minuta revisada.")
            if request.analysis_id:
                analysis_row = await (await db.execute("SELECT payload FROM analyses WHERE id=? AND case_id=?", (str(request.analysis_id), request.case_id))).fetchone()
                if analysis_row is None:
                    raise HTTPException(422, "Análise não pertence ao caso.")
            else:
                analysis_row = await (await db.execute("SELECT payload FROM analyses WHERE case_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1", (request.case_id,))).fetchone()
            analysis = AnalyzeResponse.model_validate_json(analysis_row[0]) if analysis_row else None
            if analysis and analysis.case_version != row["version"]:
                raise HTTPException(409, "Análise desatualizada. Execute uma nova análise.")
            policy = analysis.policy if analysis else None
            is_override = None
            if policy:
                above_ceiling = request.action == "ACORDO" and policy.settlement_pricing is not None and request.settlement_amount > policy.settlement_pricing.ceiling
                is_override = request.action != policy.recommendation or bool(above_ceiling)
                if is_override and not request.override_reason:
                    raise HTTPException(422, "Informe override_reason para divergir da política ou exceder o teto.")
            response = DecisionResponse(decision_id=uuid4(), case_id=request.case_id, action=request.action,
                settlement_amount=request.settlement_amount, is_override=is_override,
                case_version=row["version"]+1, created_at=now())
            await db.execute("INSERT INTO decisions VALUES (?,?,?,?,?,?,?)", (
                str(response.decision_id), request.case_id, str(request.idempotency_key), response.created_at.isoformat(),
                serialized, response.model_dump_json(), analysis.model_dump_json() if analysis else None))
            await db.execute("UPDATE cases SET status='CONCLUIDO',version=version+1 WHERE id=?", (request.case_id,))
            await db.commit()
        return response

    async def decisions(self, case_id: int | None = None, *, limit: int = 200, offset: int = 0) -> DecisionListResponse:
        async with self.connect() as db:
            await db.execute("BEGIN")
            query, params = (" WHERE case_id=?", (case_id,)) if case_id is not None else ("", ())
            total = (await (await db.execute("SELECT count(*) FROM decisions"+query, params)).fetchone())[0]
            rows = await (await db.execute("SELECT * FROM decisions"+query+
                " ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?", (*params, limit, offset))).fetchall()
        items = [{"decision": json.loads(r["response_payload"]), "registration": json.loads(r["request_payload"]),
                 "analysis": json.loads(r["analysis_payload"]) if r["analysis_payload"] else None} for r in rows]
        return DecisionListResponse(items=items, total=total, limit=limit, offset=offset,
            has_more=offset + len(items) < total)

    async def demo_lawyer_adherence(self) -> list[dict]:
        async with self.connect() as db:
            rows = await (await db.execute(
                "SELECT name, decisions, adherence, law_firm FROM demo_lawyer_adherence ORDER BY adherence DESC, name"
            )).fetchall()
        return [dict(row) for row in rows]

    async def counts(self) -> dict:
        async with self.connect() as db:
            row = await (await db.execute("""SELECT
                (SELECT count(*) FROM cases) AS total_cases,
                count(*) AS decision_count,
                count(DISTINCT json_extract(request_payload,'$.lawyer_id')) AS active_lawyers_count,
                count(DISTINCT json_extract(request_payload,'$.law_firm_id')) AS partner_law_firms_count
                FROM decisions""")).fetchone()
        return dict(row)
