export async function fetchBackendForOwner(path: string): Promise<Response> {
  return new Response(
    JSON.stringify({
      ok: false,
      error: `Owner local endpoint not implemented yet for path: ${path}`
    }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
