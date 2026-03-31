export interface UsageSpendRecord {
  model: string
  provider: string
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
}

export interface ModelPricingRecord {
  provider: 'openai' | 'anthropic'
  model_identifier: string
  input_cost_per_million_tokens: number
  output_cost_per_million_tokens: number
  source_url: string
  verified_at: string
}

export interface ModeledModelSpend {
  model: string
  provider: string
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
  estimatedCost: number | null
  pricingMatched: boolean
}

export interface ModeledProviderSpend {
  provider: string
  estimatedAnnualCost: number | null
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
  modelCount: number
  modeledModelCount: number
  pricingCoverage: 'modeled' | 'partial' | 'unmodeled'
  coverageRate: number | null
  modelBreakdown: ModeledModelSpend[]
}

const VERIFIED_AT = '2026-03-31'

const MODEL_PRICING_LIBRARY: ModelPricingRecord[] = [
  {
    provider: 'openai',
    model_identifier: 'gpt-5',
    input_cost_per_million_tokens: 1.25,
    output_cost_per_million_tokens: 10,
    source_url: 'https://platform.openai.com/pricing',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'openai',
    model_identifier: 'gpt-5-mini',
    input_cost_per_million_tokens: 0.25,
    output_cost_per_million_tokens: 2,
    source_url: 'https://platform.openai.com/pricing',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'openai',
    model_identifier: 'gpt-5-nano',
    input_cost_per_million_tokens: 0.05,
    output_cost_per_million_tokens: 0.4,
    source_url: 'https://platform.openai.com/pricing',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'openai',
    model_identifier: 'gpt-4.1',
    input_cost_per_million_tokens: 2,
    output_cost_per_million_tokens: 8,
    source_url: 'https://platform.openai.com/pricing',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'openai',
    model_identifier: 'gpt-4.1-mini',
    input_cost_per_million_tokens: 0.4,
    output_cost_per_million_tokens: 1.6,
    source_url: 'https://platform.openai.com/pricing',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'openai',
    model_identifier: 'gpt-4.1-nano',
    input_cost_per_million_tokens: 0.1,
    output_cost_per_million_tokens: 0.4,
    source_url: 'https://platform.openai.com/pricing',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'openai',
    model_identifier: 'gpt-4o',
    input_cost_per_million_tokens: 2.5,
    output_cost_per_million_tokens: 10,
    source_url: 'https://platform.openai.com/pricing',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'openai',
    model_identifier: 'gpt-4o-mini',
    input_cost_per_million_tokens: 0.15,
    output_cost_per_million_tokens: 0.6,
    source_url: 'https://platform.openai.com/pricing',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'openai',
    model_identifier: 'text-embedding-3-small',
    input_cost_per_million_tokens: 0.02,
    output_cost_per_million_tokens: 0,
    source_url: 'https://developers.openai.com/api/docs/models/text-embedding-3-small',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'openai',
    model_identifier: 'text-embedding-3-large',
    input_cost_per_million_tokens: 0.13,
    output_cost_per_million_tokens: 0,
    source_url: 'https://developers.openai.com/api/docs/models/text-embedding-3-large',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'anthropic',
    model_identifier: 'claude-opus-4.1',
    input_cost_per_million_tokens: 15,
    output_cost_per_million_tokens: 75,
    source_url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'anthropic',
    model_identifier: 'claude-opus-4',
    input_cost_per_million_tokens: 15,
    output_cost_per_million_tokens: 75,
    source_url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'anthropic',
    model_identifier: 'claude-sonnet-4',
    input_cost_per_million_tokens: 3,
    output_cost_per_million_tokens: 15,
    source_url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'anthropic',
    model_identifier: 'claude-sonnet-3.7',
    input_cost_per_million_tokens: 3,
    output_cost_per_million_tokens: 15,
    source_url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'anthropic',
    model_identifier: 'claude-sonnet-3.5',
    input_cost_per_million_tokens: 3,
    output_cost_per_million_tokens: 15,
    source_url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'anthropic',
    model_identifier: 'claude-haiku-3.5',
    input_cost_per_million_tokens: 0.8,
    output_cost_per_million_tokens: 4,
    source_url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
    verified_at: VERIFIED_AT,
  },
  {
    provider: 'anthropic',
    model_identifier: 'claude-haiku-3',
    input_cost_per_million_tokens: 0.25,
    output_cost_per_million_tokens: 1.25,
    source_url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
    verified_at: VERIFIED_AT,
  },
]

function normalizeProvider(provider: string | null | undefined) {
  return (provider ?? '').trim().toLowerCase()
}

function normalizeModel(model: string | null | undefined) {
  return (model ?? '').trim().toLowerCase()
}

function matchesModelIdentifier(model: string, identifier: string) {
  return (
    model === identifier ||
    model.startsWith(`${identifier}-`) ||
    model.startsWith(`${identifier}:`) ||
    model.startsWith(`${identifier}@`)
  )
}

export function findModelPricing(model: string, provider: string) {
  const normalizedModel = normalizeModel(model)
  const normalizedProvider = normalizeProvider(provider) as ModelPricingRecord['provider']
  if (!normalizedModel || !normalizedProvider) return null

  const candidates = MODEL_PRICING_LIBRARY
    .filter((record) => record.provider === normalizedProvider)
    .sort((left, right) => right.model_identifier.length - left.model_identifier.length)

  for (const candidate of candidates) {
    if (matchesModelIdentifier(normalizedModel, candidate.model_identifier)) {
      return candidate
    }
  }

  return null
}

export function calculateModeledCost(record: UsageSpendRecord) {
  const pricing = findModelPricing(record.model, record.provider)
  if (!pricing) return null

  return (
    (record.totalInputTokens / 1_000_000) * pricing.input_cost_per_million_tokens +
    (record.totalOutputTokens / 1_000_000) * pricing.output_cost_per_million_tokens
  )
}

export function buildModeledProviderSpend(records: UsageSpendRecord[]): ModeledProviderSpend[] {
  const byProvider = records.reduce((accumulator, record) => {
    const provider = normalizeProvider(record.provider)
    if (!provider) {
      return accumulator
    }

    if (!accumulator[provider]) {
      accumulator[provider] = []
    }
    accumulator[provider].push(record)
    return accumulator
  }, {} as Record<string, UsageSpendRecord[]>)

  return Object.entries(byProvider).map(([provider, providerRecords]) => {
    const modelBreakdown = providerRecords.map((record) => {
      const estimatedCost = calculateModeledCost(record)
      return {
        model: record.model,
        provider: record.provider,
        totalInputTokens: record.totalInputTokens,
        totalOutputTokens: record.totalOutputTokens,
        totalRequests: record.totalRequests,
        estimatedCost,
        pricingMatched: estimatedCost != null,
      } satisfies ModeledModelSpend
    })

    const totalInputTokens = providerRecords.reduce((sum, record) => sum + record.totalInputTokens, 0)
    const totalOutputTokens = providerRecords.reduce((sum, record) => sum + record.totalOutputTokens, 0)
    const totalRequests = providerRecords.reduce((sum, record) => sum + record.totalRequests, 0)
    const totalTokens = totalInputTokens + totalOutputTokens
    const modeledModelCount = modelBreakdown.filter((record) => record.pricingMatched).length
    const modeledTokenVolume = modelBreakdown.reduce((sum, record) => (
      record.pricingMatched
        ? sum + record.totalInputTokens + record.totalOutputTokens
        : sum
    ), 0)
    const estimatedAnnualCost = modeledModelCount > 0
      ? modelBreakdown.reduce((sum, record) => sum + (record.estimatedCost ?? 0), 0)
      : null

    const pricingCoverage = modeledModelCount === 0
      ? 'unmodeled'
      : modeledModelCount === modelBreakdown.length
        ? 'modeled'
        : 'partial'

    const coverageRate = totalTokens > 0
      ? (modeledTokenVolume / totalTokens) * 100
      : modelBreakdown.length > 0
        ? (modeledModelCount / modelBreakdown.length) * 100
        : null

    return {
      provider,
      estimatedAnnualCost,
      totalInputTokens,
      totalOutputTokens,
      totalRequests,
      modelCount: modelBreakdown.length,
      modeledModelCount,
      pricingCoverage,
      coverageRate,
      modelBreakdown,
    } satisfies ModeledProviderSpend
  })
}

export function getUsageBillingProviderLabel(provider: string) {
  const normalizedProvider = normalizeProvider(provider)
  if (normalizedProvider === 'openai') return 'OpenAI'
  if (normalizedProvider === 'anthropic') return 'Anthropic'
  return provider
}

