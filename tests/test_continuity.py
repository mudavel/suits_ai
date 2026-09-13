import asyncio
import json
import sqlite3
from dataclasses import replace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.backend.config import Settings
from src.backend.main import create_app
from src.backend.schemas import AnalyzeResponse, StrategyRequest, PolicyResult
from src.backend.services.copilot import AssessmentText, GroundedText


@pytest.fixture
def settings(tmp_path):
    return Settings(database_path=tmp_path / 'continuity.sqlite3')


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as value:
        yield value


def assess(client, case_id=2):
    result = client.post('/api/analyze', json={'case_id': case_id})
    assert result.status_code == 200, result.text
    return result.json()


def direction(analysis, **extra):
    return {'case_id': analysis['case_id'], 'analysis_id': analysis['analysis_id'],
            'expected_case_version': analysis['case_version'], 'action': 'ACORDO',
            'settlement_amount': 2345.67, 'rationale': 'Priorizar composição após revisar as pendências.', **extra}


def save_direction(client, analysis, **extra):
    result = client.post('/api/strategy', json=direction(analysis, **extra))
    assert result.status_code == 201, result.text
    return result.json()


def draft_request(strategy, **extra):
    return {'case_id': strategy['case_id'], 'strategy_id': strategy['strategy_id'],
            'action': strategy['action'], 'settlement_amount': strategy['settlement_amount'], **extra}


def final_request(strategy, draft, **extra):
    return {'case_id': strategy['case_id'], 'action': strategy['action'],
            'settlement_amount': strategy['settlement_amount'], 'analysis_id': strategy['analysis_id'],
            'expected_case_version': strategy['case_version'], 'override_reason': strategy['rationale'],
            'lawyer_id': 'Advogado de teste', 'law_firm_id': 'Escritório de teste',
            'draft_id': draft['draft_id'], 'reviewed_content_markdown': '# Texto revisado\n\nCondições conferidas.',
            'idempotency_key': str(uuid4()), **extra}


def test_assessment_persists_comparison_and_creation_time(client, settings):
    analysis = assess(client)
    assert analysis['author_arguments'] and analysis['defense_arguments'] and analysis['created_at']
    saved = client.get('/api/cases/2/analysis').json()['analysis']
    assert saved == analysis
    with TestClient(create_app(settings)) as restarted:
        assert restarted.get('/api/cases/2/analysis').json()['analysis'] == analysis


def test_strategy_requires_current_case_and_analysis(client):
    assert client.get('/api/cases/2/strategy').json() == {'status': 'not_found', 'strategy': None}
    missing = {'case_id': 2, 'analysis_id': str(uuid4()), 'case_version': 0}
    assert client.post('/api/strategy', json=direction(missing)).status_code == 409
    analysis = assess(client)
    assert client.post('/api/strategy', json=direction(analysis, case_id=1)).status_code == 409
    assert client.post('/api/strategy', json=direction(analysis, expected_case_version=2)).status_code == 409
    assert client.post('/api/strategy', json=direction(analysis, settlement_amount=1.001)).status_code == 422


def test_entire_flow_survives_restart_and_preserves_exact_review(settings):
    with TestClient(create_app(settings)) as client:
        analysis = assess(client)
        strategy = save_direction(client, analysis)
        draft = client.post('/api/generate-draft', json=draft_request(strategy)).json()
        assert draft['analysis_id'] == analysis['analysis_id']
        assert draft['strategy'] == strategy
        assert client.get('/api/cases/2').json()['status'] != 'CONCLUIDO'
    with TestClient(create_app(settings)) as client:
        assert client.get('/api/cases/2/strategy').json() == {'status': 'available', 'strategy': strategy}
        assert client.get('/api/cases/2/drafts').json()['items'][0]['strategy'] == strategy
        body = final_request(strategy, draft, reviewed_content_markdown='  # Revisão\n\nTexto com formatação preservada.\n\n')
        response = client.post('/api/decisions', json=body)
        assert response.status_code == 201, response.text
        assert client.post('/api/decisions', json=body).json() == response.json()
        assert client.get('/api/cases/2').json()['status'] == 'CONCLUIDO'
        assert client.post('/api/strategy', json=direction(analysis)).status_code == 409
    with TestClient(create_app(settings)) as client:
        record = client.get('/api/decisions?case_id=2').json()['items'][0]
        assert record['registration']['reviewed_content_markdown'] == body['reviewed_content_markdown']
        assert record['registration']['draft_id'] == draft['draft_id']
        assert record['analysis'] == analysis
        assert client.get('/api/drafts/' + draft['draft_id']).json()['content_markdown'] == draft['content_markdown']


def test_new_analysis_invalidates_strategy_even_without_document_changes(client):
    first = assess(client)
    strategy = save_direction(client, first)
    draft = client.post('/api/generate-draft', json=draft_request(strategy)).json()
    latest = assess(client)
    assert latest['case_version'] == first['case_version']
    assert client.get('/api/cases/2/strategy').json()['status'] == 'stale'
    assert client.post('/api/strategy', json=direction(first)).status_code == 409
    assert client.post('/api/generate-draft', json=draft_request(strategy)).status_code == 409
    assert client.post('/api/decisions', json=final_request(strategy, draft)).status_code == 409
    assert client.get('/api/drafts/' + draft['draft_id']).status_code == 200
    assert client.post('/api/export-pdf', json={'draft_id': draft['draft_id'], 'format': 'html'}).status_code == 200
    assert save_direction(client, latest)['analysis_id'] == latest['analysis_id']


def test_new_strategy_and_tampered_draft_cannot_change_final_decision(client):
    analysis = assess(client)
    strategy = save_direction(client, analysis)
    assert client.post('/api/generate-draft', json=draft_request(strategy, case_id=1)).status_code == 409
    assert client.post('/api/generate-draft', json=draft_request(strategy, settlement_amount=9999)).status_code == 422
    draft = client.post('/api/generate-draft', json=draft_request(strategy)).json()
    assert client.post('/api/decisions', json=final_request(strategy, draft, settlement_amount=9999)).status_code == 409
    assert client.post('/api/decisions', json=final_request(strategy, draft, reviewed_content_markdown=None)).status_code == 422
    revised = save_direction(client, analysis, settlement_amount=3000)
    assert revised['strategy_id'] != strategy['strategy_id']
    assert client.post('/api/decisions', json=final_request(strategy, draft)).status_code == 409
    assert client.post('/api/generate-draft', json=draft_request(strategy)).status_code == 409
    assert client.get('/api/decisions?case_id=2').json()['total'] == 0


def test_policy_override_requires_justification(settings):
    with TestClient(create_app(replace(settings, data_mode='mock', policy_mode='mock'))) as client:
        analysis = assess(client)
        assert client.post('/api/strategy', json=direction(analysis, action='DEFESA', settlement_amount=None, rationale=None)).status_code == 422
        assert save_direction(client, analysis, action='DEFESA', settlement_amount=None)['rationale']


def test_one_ai_assessment_feeds_the_draft_with_sources_and_direction(settings):
    app = create_app(replace(settings, ai_mode='openai', openai_api_key='test-only'))
    with TestClient(app) as client:
        source = app.state.copilot.context(asyncio.run(app.state.store.get_case(2)), 'contrato extrato liveness titularidade parecer crédito', limit=10)[0]
        argument = GroundedText(text='Conferir o registro original.', source_ids=[source.source_id], warnings=[])
        assessment = AssessmentText(text='Avaliação interna persistida.', source_ids=[source.source_id], warnings=[],
            author_arguments=[argument], defense_arguments=[argument])
        app.state.copilot.generate = AsyncMock(return_value=assessment)
        app.state.copilot.scenarios = AsyncMock(side_effect=AssertionError('A comparação não deve gerar outra chamada.'))
        analysis = assess(client)
        assert app.state.copilot.generate.await_count == 1
        prompt = app.state.copilot.generate.await_args.args[1]
        assert 'RESUMO TEXTUAL DO PROCESSO' in prompt
        assert 'sem títulos, listas' in prompt
        assert 'pedidos efetivamente identificados' in prompt
        assert 'Não confunda valor da causa com valor contratado' in prompt
        assert analysis['explanation'] == assessment.text
        strategy = save_direction(client, analysis, action='DEFESA', settlement_amount=None)
        app.state.copilot.generate.reset_mock()
        app.state.copilot.generate.return_value = GroundedText(text='Peça fundamentada.', source_ids=[source.source_id], warnings=[])
        response = client.post('/api/generate-draft', json=draft_request(strategy))
        assert response.status_code == 201, response.text
        call = app.state.copilot.generate.await_args
        assert call.kwargs['extra']['analysis']['analysis_id'] == analysis['analysis_id']
        assert call.kwargs['extra']['analysis']['defense_arguments']
        assert call.kwargs['extra']['strategy'] == strategy
        assert source.source_id in {item.source_id for item in call.args[3]}
        assert response.json()['sources'][0]['source_id'] == source.source_id


def test_strategy_changed_during_generation_prevents_saving_stale_piece(settings):
    app = create_app(settings)
    with TestClient(app) as client:
        analysis = assess(client)
        strategy = save_direction(client, analysis)
        app.state.copilot.settings = replace(settings, ai_mode='openai', openai_api_key='test-only')
        async def changed_during_generation(*args, **kwargs):
            await app.state.store.save_strategy(StrategyRequest(**direction(analysis, settlement_amount=5000)))
            return GroundedText(text='Texto já desatualizado.', source_ids=[], warnings=[])
        app.state.copilot.generate = changed_during_generation
        response = client.post('/api/generate-draft', json=draft_request(strategy))
        assert response.status_code == 409
        assert client.get('/api/cases/2/drafts').json()['total'] == 0


def test_model_explanation_reaches_assessment_and_its_linked_draft(settings, monkeypatch):
    from src.policy import engine
    policy = PolicyResult(recommendation='DEFESA', reasoning_code='CADEIA_COMPLETA',
        confidence_score=0.95, risk_level='BAIXO', plain_language_explanation='Justificativa do motor.',
        decision_path=['Presença dos documentos centrais.'], forest_consensus_reasons=['Coerência documental.'],
        applied_rules=['Regra de teste.'])
    monkeypatch.setattr(engine, 'evaluate_case', lambda payload: policy)
    app = create_app(replace(settings, policy_mode='engine', ai_mode='openai', openai_api_key='test-only'))
    with TestClient(app) as client:
        app.state.copilot.generate = AsyncMock(return_value=AssessmentText(text='Parecer de teste.', source_ids=[],
            warnings=[], author_arguments=[], defense_arguments=[]))
        analysis = assess(client)
        assert app.state.copilot.generate.await_args.kwargs['extra']['policy'] == policy.model_dump()
        strategy = save_direction(client, analysis, action='DEFESA', settlement_amount=None)
        app.state.copilot.generate.return_value = GroundedText(text='Peça de teste.', source_ids=[], warnings=[])
        response = client.post('/api/generate-draft', json=draft_request(strategy))
        assert response.status_code == 201, response.text
        extra = app.state.copilot.generate.await_args.kwargs['extra']
        assert extra['policy'] == policy.model_dump()
        assert extra['analysis']['policy'] == policy.model_dump()
        assert extra['strategy']['analysis_id'] == analysis['analysis_id']


@pytest.mark.parametrize('code,action,rule,expected', [
    ('CADEIA_COMPLETA', 'DEFESA', 'Força Probatória Plena: contrato e comprovantes.', 'recommendation_confidence'),
    ('FALHA_PROBATORIA', 'ACORDO', 'Falha Probatória Severa: documentos ausentes.', 'recommendation_confidence'),
    ('DOSSIE_NAO_CONFORME', 'ACORDO', 'Auditoria Probatória: Dossiê Grafotécnico/Facial com divergência.', 'recommendation_confidence'),
    ('ML_ZONA_CINZENTA', 'ACORDO', 'Zona Cinzenta Probatória: avaliação complementar.', 'loss_probability'),
    ('ML_ZONA_CINZENTA', 'DEFESA', 'Zona Cinzenta Probatória: avaliação complementar.', 'recommendation_confidence'),
    ('CADEIA_COMPLETA', 'DEFESA', 'Regra de outro produtor.', 'unspecified'),
])
def test_legacy_score_uses_the_identified_rule_not_only_the_action(code, action, rule, expected):
    policy = PolicyResult(recommendation=action, reasoning_code=code, confidence_score=0.9,
        risk_level='MEDIO', applied_rules=[rule])
    analysis = AnalyzeResponse(case_id=1, policy=policy, policy_status='available', explanation='Parecer salvo.',
        warnings=[], data_mode='artifacts')
    assert analysis.policy.confidence_score_semantics == expected
    assert analysis.policy.confidence_score == 0.9
    declared = policy.model_copy(update={'confidence_score_semantics': 'loss_probability'})
    explicit = AnalyzeResponse(case_id=1, policy=declared, policy_status='available', explanation='Parecer salvo.',
        warnings=[], data_mode='artifacts')
    assert explicit.policy.confidence_score_semantics == 'loss_probability'


def test_reopening_legacy_assessment_describes_score_without_rewriting_or_regenerating(settings):
    with TestClient(create_app(replace(settings, policy_mode='engine'))) as client:
        analysis = assess(client, 1)
        analysis['policy']['confidence_score_semantics'] = 'unspecified'
        warning = 'B1 não declara a semântica de confidence_score; não apresentar como probabilidade de derrota.'
        analysis['warnings'].append(warning)
        legacy_payload = json.dumps(analysis)
        with sqlite3.connect(settings.database_path) as db:
            db.execute('UPDATE analyses SET payload=? WHERE id=?', (legacy_payload, analysis['analysis_id']))
        refreshed = client.get('/api/cases/1/analysis').json()['analysis']
        assert refreshed['analysis_id'] == analysis['analysis_id']
        assert refreshed['policy']['confidence_score'] == 0.95
        assert refreshed['policy']['confidence_score_semantics'] == 'recommendation_confidence'
        assert warning not in refreshed['warnings']
        assert refreshed['explanation'] == analysis['explanation']
        with sqlite3.connect(settings.database_path) as db:
            assert db.execute('SELECT payload FROM analyses WHERE id=?', (analysis['analysis_id'],)).fetchone()[0] == legacy_payload
