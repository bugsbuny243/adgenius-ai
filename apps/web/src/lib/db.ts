const emptyArray = async () => []
const emptyObject = async () => ({})
const emptyNull = async () => null

/**
 * Placeholder data facade for cutover stability.
 * Replace with Prisma client wiring when runtime data services are re-enabled.
 */
export const db: any = {
  agent: { findMany: emptyArray, findUnique: emptyNull, create: emptyObject, update: emptyObject },
  run: { findMany: emptyArray, findUnique: emptyNull, create: emptyObject, update: emptyObject },
  approval: { findMany: emptyArray, findUnique: emptyNull, create: emptyObject, update: emptyObject },
  task: { findMany: emptyArray, create: emptyObject, update: emptyObject },
  workItem: { findMany: emptyArray, create: emptyObject },
  knowledgeSource: { findMany: emptyArray, create: emptyObject },
}
