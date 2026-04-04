import crypto from 'node:crypto'

export async function uploadAsset(file: File) {
  const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${file.name}`
  return {
    storageKey: key,
    sourceUrl: `https://storage.example.com/${key}`,
  }
}
