"""Exercise the actual policy output through the lawyer-facing presentation, without saving cases."""
import json
import shutil
import subprocess

import pytest

from src.backend.config import REPO_ROOT
from src.policy.engine import evaluate_case, get_model


def test_real_policy_results_reach_legal_presentation_without_changing_decisions():
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required for the cross-language presentation check")
    assert get_model() is not None, "The supplied model must be available for this check"
    documents = [
        {"contrato": True, "extrato": True, "comprovante_credito": True, "demonstrativo_divida": True},
        {"contrato": False, "extrato": False, "comprovante_credito": False},
        {"contrato": True, "extrato": True, "comprovante_credito": False, "dossie": "CONFORME"},
        {"contrato": False, "extrato": True, "comprovante_credito": True},
        {"contrato": True, "extrato": True, "comprovante_credito": True, "dossie": "NAO_CONFORME"},
    ]
    results = [evaluate_case({"numero_processo": f"TEST-{i}", "uf": "SP", "valor_causa": 22000,
                             "subsidios": subsidies}).model_dump() for i, subsidies in enumerate(documents)]
    script = """
        import fs from 'node:fs';
        import { policyExplanation } from './src/frontend/src/services/policyExplanation.js';
        const results = JSON.parse(fs.readFileSync(0, 'utf8'));
        console.log(JSON.stringify(results.map(policy => policyExplanation({ policy, policy_status: 'available' }))));
    """
    completed = subprocess.run([node, "--input-type=module", "-e", script], cwd=REPO_ROOT,
                               input=json.dumps(results), text=True, encoding="utf-8", capture_output=True, check=True)
    rendered = json.loads(completed.stdout)
    for raw, presented in zip(results, rendered):
        assert presented["recommendation"] == {"DEFESA": "Defesa", "ACORDO": "Acordo"}[raw["recommendation"]]
        assert len(presented["path"]) == len(raw["decision_path"])
        assert len(presented["factors"]) == len(raw["forest_consensus_reasons"])
        assert presented["rules"]
        if raw["reasoning_code"] == "ML_ZONA_CINZENTA":
            assert "estatística" in presented["origin"]
            assert presented["path"]
            assert presented["factorsTitle"] == "Fatores recorrentes na avaliação"
        else:
            assert "documental" in presented["origin"]
        text = json.dumps(presented, ensure_ascii=False)
        assert "Random Forest" not in text
        assert "95.9%" not in text
        assert "Fraude Confirmada" not in text
