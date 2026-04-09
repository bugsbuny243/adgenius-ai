from pydantic import BaseModel, Field


class AgentPromptPayload(BaseModel):
    """Incoming payload sent by the frontend over WebSocket."""

    prompt: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)
    user_id: str = Field(..., min_length=1)


class AgentRunInsert(BaseModel):
    """Supabase insert payload for the `agent_runs` table."""

    agent_type_id: str | None = None
    user_id: str
    workspace_id: str
    user_input: str
    status: str
    model_name: str
    created_at: str
    updated_at: str
