"""Exercise citation constraints through the real SDK, without external calls."""

import asyncio
import json
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx2
import pytest
from fastapi import HTTPException
from openai import AsyncOpenAI

from src.backend.config import Settings
from src.backend.schemas import ChatRequest, SourceReference
from src.backend.services.copilot import AssessmentText, Copilot, GroundedText, ScenarioText
from src.backend.services.document_service import DocumentService
from src.backend.services.mocks import demo_cases


def source(source_id):
    return SourceReference(source_id=source_id, document_id=source_id.split(":")[0],
        document_name="Documento de teste", page=1, excerpt="Trecho documental.")


def provider_response(output):
    return httpx2.Response(200, json={
        "id": "resp_sources", "object": "response", "created_at": 0,
        "status": "completed", "model": "gpt-6-astra",
        "output": [{"id": "msg_sources", "type": "message", "status": "completed",
            "role": "assistant", "content": [{"type": "output_text", "annotations": [],
                "text": json.dumps(output)}]}],
    })


@pytest.mark.parametrize("schema", [GroundedText, AssessmentText, ScenarioText])
@pytest.mark.parametrize("available_ids", [[], ["contract:p1:s1"], ["contract:p1:s1", "statement:p2"]])
def test_sdk_restricts_every_citation_to_request_sources(schema, available_ids):
    calls = []
    grounded = {"text": "Trecho fundamentado.", "source_ids": available_ids[:1], "warnings": []}
    output = deepcopy(grounded) if schema is not ScenarioText else {}
    if schema is not GroundedText:
        output.update(author_arguments=[deepcopy(grounded)], defense_arguments=[deepcopy(grounded)])

    def handle(request):
        calls.append(json.loads(request.content))
        return provider_response(output)

    async def run():
        client = AsyncOpenAI(api_key="test-only",
            http_client=httpx2.AsyncClient(transport=httpx2.MockTransport(handle)))
        copilot = Copilot(Settings(ai_mode="openai", openai_api_key="test-only"),
            DocumentService(), None, client=client)
        try:
            result = await copilot.generate(schema, "Prepare uma minuta.", demo_cases()[0],
                [source(value) for value in available_ids])
            assert result.model_dump() == output
            # The SDK must reject a foreign ID in the body and in either side's arguments.
            targets = ([output] if schema is not ScenarioText else [])
            if schema is not GroundedText:
                targets += [output["author_arguments"][0], output["defense_arguments"][0]]
            for target in targets:
                target["source_ids"] = ["another-case:p1"]
                with pytest.raises(HTTPException) as error:
                    await copilot.generate(schema, "Prepare uma minuta.", demo_cases()[0],
                        [source(value) for value in available_ids])
                assert error.value.status_code == 502
                assert "another-case" not in error.value.detail
                target["source_ids"] = available_ids[:1]
        finally:
            await copilot.close()

    asyncio.run(run())
    sent = calls[0]["text"]["format"]
    assert sent["strict"] is True
    definition = sent["schema"]
    objects = [definition, *definition.get("$defs", {}).values()]
    citation_fields = [obj["properties"]["source_ids"] for obj in objects
        if "source_ids" in obj.get("properties", {})]
    assert citation_fields
    for field in citation_fields:
        if available_ids:
            item = field["items"]
            assert item.get("enum", [item.get("const")]) == available_ids
        else:
            assert field["maxItems"] == 0


def test_consecutive_requests_do_not_reuse_another_contexts_citations():
    calls = []

    def handle(request):
        calls.append(json.loads(request.content))
        return provider_response({"text": "Resposta.", "source_ids": ["first-case:p1"], "warnings": []})

    async def run():
        client = AsyncOpenAI(api_key="test-only",
            http_client=httpx2.AsyncClient(transport=httpx2.MockTransport(handle)))
        store = SimpleNamespace(save_exchange=AsyncMock())
        copilot = Copilot(Settings(ai_mode="openai", openai_api_key="test-only"),
            DocumentService(), store, client=client)
        try:
            copilot.context = lambda *args, **kwargs: [source("first-case:p1")]
            await copilot.chat(demo_cases()[0], ChatRequest(case_id=1, message="Primeira consulta."))
            store.save_exchange.assert_awaited_once()
            store.save_exchange.reset_mock()
            copilot.context = lambda *args, **kwargs: [source("second-case:p1")]
            with pytest.raises(HTTPException) as error:
                await copilot.chat(demo_cases()[1], ChatRequest(case_id=2, message="Outra consulta."))
            assert error.value.status_code == 502
            store.save_exchange.assert_not_awaited()
        finally:
            await copilot.close()

    asyncio.run(run())
    second_format = json.dumps(calls[1]["text"]["format"])
    assert "second-case:p1" in second_format
    assert "first-case:p1" not in second_format
