declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(config: { apiKey: string })
    models: {
      generateContent(input: {
        model: string
        contents: string
        config?: { systemInstruction?: string; temperature?: number }
      }): Promise<{
        text?: string
        usageMetadata?: {
          promptTokenCount?: number
          candidatesTokenCount?: number
        }
      }>
    }
  }
}

declare module '@supabase/ssr' {
  type CookieOptions = {
    domain?: string
    maxAge?: number
    path?: string
    secure?: boolean
    httpOnly?: boolean
    sameSite?: 'lax' | 'strict' | 'none'
  }

  export function createBrowserClient(url: string, key: string): any
  export function createServerClient(
    url: string,
    key: string,
    options: {
      cookies: {
        getAll: () => Array<{ name: string; value: string }>
        setAll: (cookies: Array<{ name: string; value: string; options?: CookieOptions }>) => void
      }
    },
  ): any
}
