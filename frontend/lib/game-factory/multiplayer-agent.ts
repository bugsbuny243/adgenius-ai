import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type MultiplayerProvider = 'netcode' | 'mirror';

export type MultiplayerBlueprint = {
  provider: MultiplayerProvider;
  lobbyScriptPath: string;
  syncScriptPath: string;
  lobbyCode: string;
  syncCode: string;
};

const TABLE_SQL = `
create table if not exists public.matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  room_code text not null,
  status text not null default 'queued',
  payload jsonb,
  created_at timestamptz not null default now()
);
`;

export function generateMultiplayerBlueprint(gameName: string, provider: MultiplayerProvider = 'netcode'): MultiplayerBlueprint {
  const safeName = gameName.replace(/[^a-zA-Z0-9]/g, '') || 'Koschei';
  const classPrefix = safeName.charAt(0).toUpperCase() + safeName.slice(1);

  const lobbyCode = provider === 'mirror'
    ? `using Mirror;\nusing UnityEngine;\n\npublic class ${classPrefix}LobbyManager : NetworkManager\n{\n    public override void OnServerAddPlayer(NetworkConnectionToClient conn)\n    {\n        base.OnServerAddPlayer(conn);\n        Debug.Log($"[Lobby] Player joined: {conn.connectionId}");\n    }\n}`
    : `using Unity.Netcode;\nusing UnityEngine;\n\npublic class ${classPrefix}LobbyManager : NetworkBehaviour\n{\n    public void StartHostLobby()\n    {\n        NetworkManager.Singleton.StartHost();\n        Debug.Log("[Lobby] Host started");\n    }\n\n    public void JoinLobby()\n    {\n        NetworkManager.Singleton.StartClient();\n        Debug.Log("[Lobby] Client joining");\n    }\n}`;

  const syncCode = provider === 'mirror'
    ? `using Mirror;\nusing UnityEngine;\n\npublic class ${classPrefix}PlayerSync : NetworkBehaviour\n{\n    [SyncVar] public Vector3 SyncedPosition;\n\n    void Update()\n    {\n        if (!isLocalPlayer) return;\n        CmdSyncPosition(transform.position);\n    }\n\n    [Command]\n    private void CmdSyncPosition(Vector3 value)\n    {\n        SyncedPosition = value;\n    }\n}`
    : `using Unity.Netcode;\nusing UnityEngine;\n\npublic class ${classPrefix}PlayerSync : NetworkBehaviour\n{\n    public NetworkVariable<Vector3> Position = new(writePerm: NetworkVariableWritePermission.Owner);\n\n    void Update()\n    {\n        if (!IsOwner) return;\n        Position.Value = transform.position;\n    }\n}`;

  return {
    provider,
    lobbyScriptPath: `unity-client/Assets/Scripts/Multiplayer/${classPrefix}LobbyManager.cs`,
    syncScriptPath: `unity-client/Assets/Scripts/Multiplayer/${classPrefix}PlayerSync.cs`,
    lobbyCode,
    syncCode,
  };
}

export function matchmakingSchemaSql(): string {
  return TABLE_SQL;
}

export async function enqueueMatchmakingPlayer(userId: string, roomCode: string, payload: Record<string, unknown>, client?: SupabaseClient) {
  const supabase = client ?? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '');
  return supabase.from('matchmaking_queue').insert({ user_id: userId, room_code: roomCode, payload });
}
