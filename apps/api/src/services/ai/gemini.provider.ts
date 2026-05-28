import type {
  AIProvider,
  GenerateCopyParams,
  CopyVariant,
  ReviewArtParams,
  ArtReviewResult,
} from './provider.interface'

// Importación dinámica para evitar error si el paquete no está instalado
let GoogleGenerativeAI: unknown = null

async function loadGemini() {
  if (!GoogleGenerativeAI) {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — optional dependency, installed only when AI_PROVIDER=gemini
      const mod = await import('@google/generative-ai')
      GoogleGenerativeAI = mod.GoogleGenerativeAI
    } catch {
      throw new Error(
        'Paquete @google/generative-ai no instalado. Ejecutá: pnpm add @google/generative-ai --filter @orbit/api'
      )
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return GoogleGenerativeAI as any
}

export class GeminiProvider implements AIProvider {
  private model: string

  constructor() {
    this.model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'
  }

  async generateCopy(params: GenerateCopyParams): Promise<CopyVariant[]> {
    const GeminiClass = await loadGemini()
    const genAI = new GeminiClass(process.env.GEMINI_API_KEY ?? '')
    const model = genAI.getGenerativeModel({
      model: params.model || this.model,
      systemInstruction: params.systemPrompt,
    })

    const result = await model.generateContent(params.userPrompt)
    const text = result.response.text()

    // Limpiar markdown code blocks si los hay
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(cleaned) as { variants: CopyVariant[] }
      return parsed.variants
    } catch {
      // Segundo intento: buscar JSON dentro del texto
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0]) as { variants: CopyVariant[] }
        return parsed.variants
      }
      throw new Error('AI_PARSE_ERROR: No se pudo parsear la respuesta de Gemini')
    }
  }

  async reviewArt(params: ReviewArtParams): Promise<ArtReviewResult> {
    const GeminiClass = await loadGemini()
    const genAI = new GeminiClass(process.env.GEMINI_API_KEY ?? '')
    const model = genAI.getGenerativeModel({ model: params.model || this.model })

    const result = await model.generateContent([
      {
        inlineData: {
          data: params.imageBase64,
          mimeType: params.mediaType,
        },
      },
      params.userPrompt,
    ])

    const text = result.response.text()
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      return JSON.parse(cleaned) as ArtReviewResult
    } catch {
      throw new Error('AI_PARSE_ERROR: No se pudo parsear la revisión de arte de Gemini')
    }
  }
}
