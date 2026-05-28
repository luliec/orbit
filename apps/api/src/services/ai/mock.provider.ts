import type {
  AIProvider,
  GenerateCopyParams,
  CopyVariant,
  ReviewArtParams,
  ArtReviewResult,
} from './provider.interface'

export class MockAIProvider implements AIProvider {
  async generateCopy(params: GenerateCopyParams): Promise<CopyVariant[]> {
    // Simula latencia de red
    await new Promise((r) => setTimeout(r, 800))

    // Extrae las secciones del prompt para devolver estructura consistente
    const sectionMatch = params.userPrompt.match(/SECCIONES:\n([\s\S]*?)(?:\n\n|$)/)
    const sections = sectionMatch
      ? sectionMatch[1]
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [key, label] = line.split('|').map((s) => s.trim())
            return {
              key: key ?? 'section',
              label: label ?? key ?? 'Sección',
              value: `[Generación IA próximamente disponible — ${label ?? key}]`,
              charLimit: null,
            }
          })
      : [
          {
            key: 'body',
            label: 'Contenido',
            value: '[Generación con IA próximamente disponible. Completá manualmente.]',
            charLimit: null,
          },
        ]

    return [
      {
        sections,
        strategyNote:
          '⏳ Generación IA pendiente de acceso a Gemini. Esta es una respuesta de placeholder.',
      },
    ]
  }

  async reviewArt(_params: ReviewArtParams): Promise<ArtReviewResult> {
    await new Promise((r) => setTimeout(r, 1000))

    return {
      overallStatus: 'approved_with_observations',
      extractedText: '[Revisión IA de artes próximamente disponible]',
      findings: [
        {
          severity: 'info',
          category: 'mock',
          description:
            'La revisión automática de artes con IA estará disponible en V2. Por ahora, Copy debe revisar manualmente.',
          recommendation: 'Revisar manualmente los artes contra el copy aprobado.',
        },
      ],
      briefChecklist: [
        {
          item: 'Revisión IA disponible',
          status: 'na',
          notes: 'Pendiente de acceso a Gemini API',
        },
      ],
    }
  }
}
