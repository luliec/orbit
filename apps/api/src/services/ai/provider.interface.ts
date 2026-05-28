export interface CopySection {
  key: string
  label: string
  value: string
  charLimit: number | null
}

export interface CopyVariant {
  sections: CopySection[]
  strategyNote: string
}

export interface GenerateCopyParams {
  systemPrompt: string
  userPrompt: string
  model: string
}

export interface ArtReviewFinding {
  severity: 'critical' | 'moderate' | 'minor' | 'info'
  category: string
  description: string
  detectedText?: string
  expectedText?: string
  location?: string
  recommendation?: string
}

export interface ArtReviewResult {
  overallStatus: 'approved' | 'approved_with_observations' | 'requires_changes'
  extractedText: string
  findings: ArtReviewFinding[]
  briefChecklist: Array<{ item: string; status: 'pass' | 'fail' | 'na'; notes?: string }>
}

export interface ReviewArtParams {
  imageBase64: string
  mediaType: 'image/jpeg' | 'image/png'
  systemPrompt: string
  userPrompt: string
  model: string
}

export interface AIProvider {
  generateCopy(params: GenerateCopyParams): Promise<CopyVariant[]>
  reviewArt(params: ReviewArtParams): Promise<ArtReviewResult>
}
