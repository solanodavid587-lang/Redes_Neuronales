import json
from unittest.mock import MagicMock, patch
from urllib.request import Request

import pytest

from app.core.config import Settings
from app.core.github_actions import GitHubActionsError, dispatch_training_workflow


def test_dispatches_training_job_to_configured_repository():
    settings = Settings(
        _env_file=None,
        supabase_url="https://test-project.supabase.co",
        github_actions_token="test-token",
        github_actions_repository="owner/repository",
    )
    response = MagicMock()
    response.status = 204
    response.__enter__.return_value = response

    with patch("app.core.github_actions.urlopen", return_value=response) as open_url:
        assert dispatch_training_workflow("job-123", settings)

    request = open_url.call_args.args[0]
    assert isinstance(request, Request)
    assert request.full_url == (
        "https://api.github.com/repos/owner/repository/actions/workflows/"
        "training-worker.yml/dispatches"
    )
    assert json.loads(request.data) == {
        "ref": "main",
        "inputs": {"job_id": "job-123"},
    }
    assert request.get_header("Authorization") == "Bearer test-token"


def test_dispatch_is_disabled_when_credentials_are_not_configured():
    settings = Settings(
        _env_file=None,
        supabase_url="https://test-project.supabase.co",
    )

    assert not dispatch_training_workflow("job-123", settings)


def test_partial_github_actions_configuration_is_rejected():
    settings = Settings(
        _env_file=None,
        supabase_url="https://test-project.supabase.co",
        github_actions_repository="owner/repository",
    )

    with pytest.raises(GitHubActionsError, match="GH_ACTIONS_TOKEN"):
        dispatch_training_workflow("job-123", settings)
