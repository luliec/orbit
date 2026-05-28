import type { AIProvider } from './provider.interface'
import { MockAIProvider } from './mock.provider'
import { GeminiProvider } from './gemini.provider'

export * from './provider.interface'

let _provider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (_provider) return _provider

  if (process.env.AI_PROVIDER === 'gemini' && process.env.GEMINI_API_KEY) {
    _provider = new GeminiProvider()
  } else {
    _provider = new MockAIProvider()
  }

  return _provider
}

export function isAIAvailable(): boolean {
  return process.env.AI_PROVIDER === 'gemini' && !!process.env.GEMINI_API_KEY
}
