const emptyArray = async () => []
const emptyObject = async () => ({})
const emptyNull = async () => null

/**
 * Legacy compatibility shim. Koschei uses Supabase directly in new app flows.
 * Existing archive API routes keep importing this facade.
 */
export const db: any = {
  agent: { findMany: emptyArray, findUnique: emptyNull, create: emptyObject, update: emptyObject },
  run: { findMany: emptyArray, findUnique: emptyNull, create: emptyObject, update: emptyObject },
  runStep: { create: emptyObject },
  approval: { findMany: emptyArray, findUnique: emptyNull, create: emptyObject, update: emptyObject },
  task: { findMany: emptyArray, create: emptyObject, update: emptyObject },
  workItem: { findMany: emptyArray, create: emptyObject },
  knowledgeSource: { findMany: emptyArray, findUnique: emptyNull, create: emptyObject },
}
