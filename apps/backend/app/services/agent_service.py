import asyncio
from datetime import UTC, datetime
from typing import AsyncGenerator

from supabase import Client

from app.core.config import get_settings
from app.schemas.agent import AgentPromptPayload, AgentRunInsert

MOCK_MODEL_NAME = "gemini-mock"


async def mock_stream_response(prompt: str) -> AsyncGenerator[str, None]:
    """Yield a mock streamed response in small chunks.

    This imitates token/chunk streaming and will be replaced by Gemini API streaming.
    """

    chunks = [
        "Analyzing prompt...\n",
        "Generating plan...\n",
        f"Drafting output for: {prompt[:80]}\n",
        "Finalizing response.\n",
    ]

    for chunk in chunks:
        await asyncio.sleep(0.25)
        yield chunk


def build_agent_run_payload(payload: AgentPromptPayload, status: str) -> AgentRunInsert:
    """Build the insert payload expected by the `agent_runs` table."""

    now = datetime.now(tz=UTC).isoformat()
    settings = get_settings()

    return AgentRunInsert(
        agent_type_id=settings.default_agent_type_id,
        user_id=payload.user_id,
        workspace_id=payload.workspace_id,
        user_input=payload.prompt,
        status=status,
        model_name=MOCK_MODEL_NAME,
        created_at=now,
        updated_at=now,
    )


def insert_agent_run(client: Client, run: AgentRunInsert) -> dict:
    """Insert one `agent_runs` row and return the created record."""

    response = client.table("agent_runs").insert(run.model_dump()).execute()
    # supabase-py returns a list of inserted rows in `data`.
    inserted = response.data[0] if response.data else {}
    return inserted
