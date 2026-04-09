from pydantic import ValidationError
from starlette.websockets import WebSocketDisconnect

from fastapi import APIRouter, WebSocket, WebSocketException, status

from app.db.supabase import get_supabase_client
from app.schemas.agent import AgentPromptPayload
from app.services.agent_service import (
    build_agent_run_payload,
    insert_agent_run,
    mock_stream_response,
)

router = APIRouter()


@router.websocket("/ws/agent")
async def ws_agent(websocket: WebSocket) -> None:
    """Core websocket endpoint for AI agent interactions."""

    await websocket.accept()

    try:
        raw_payload = await websocket.receive_json()
        payload = AgentPromptPayload.model_validate(raw_payload)

        await websocket.send_json({"type": "ack", "status": "accepted"})

        aggregated_output: list[str] = []
        async for chunk in mock_stream_response(payload.prompt):
            aggregated_output.append(chunk)
            await websocket.send_json({"type": "stream", "chunk": chunk})

        supabase = get_supabase_client()
        run = build_agent_run_payload(payload, status="completed")
        inserted = insert_agent_run(supabase, run)

        await websocket.send_json(
            {
                "type": "done",
                "status": "completed",
                "agent_run": inserted,
                "output_preview": "".join(aggregated_output),
            }
        )

    except ValidationError as exc:
        await websocket.send_json(
            {
                "type": "error",
                "message": "Invalid payload. Expected: prompt, workspace_id, user_id.",
                "details": exc.errors(),
            }
        )
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION) from exc
    except WebSocketDisconnect:
        # Client disconnected before the workflow completed.
        return
    except Exception as exc:  # noqa: BLE001
        await websocket.send_json(
            {
                "type": "error",
                "message": "Unhandled server error while processing agent request.",
                "details": str(exc),
            }
        )
        raise
    finally:
        await websocket.close()
