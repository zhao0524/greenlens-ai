export type ModelCapabilityClass = 'small' | 'mid' | 'frontier' | 'unknown'

interface ModelClassRule {
  modelClass: ModelCapabilityClass
  patterns: RegExp[]
}

const MODEL_CLASS_RULES: ModelClassRule[] = [
  {
    modelClass: 'small',
    patterns: [
      /^gpt-4o-mini\b/,
      /^gpt-4\.1-mini\b/,
      /^gpt-4\.1-nano\b/,
      /^gpt-5-mini\b/,
      /^gpt-5-nano\b/,
      /^claude-3-haiku\b/,
      /^claude-3-5-haiku\b/,
      /^gemini-.*flash-lite\b/,
    ],
  },
  {
    modelClass: 'mid',
    patterns: [
      /^gpt-3\.5\b/,
      /^claude-3-sonnet\b/,
      /^claude-3-5-sonnet\b/,
      /^gemini-.*flash\b/,
    ],
  },
  {
    modelClass: 'frontier',
    patterns: [
      /^gpt-4o\b/,
      /^gpt-4\.1\b/,
      /^gpt-4\b/,
      /^gpt-5\b/,
      /^claude-3-opus\b/,
      /^claude-3-7-sonnet\b/,
      /^gemini-ultra\b/,
    ],
  },
]

function normalizeModelName(model: string | null | undefined) {
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

export function classifyModel(model: string | null | undefined): ModelCapabilityClass {
  const normalizedModel = normalizeModelName(model)
  if (!normalizedModel) return 'unknown'

  for (const rule of MODEL_CLASS_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalizedModel))) {
      return rule.modelClass
    }
  }

  return 'unknown'
}

export function isFrontierModel(model: string | null | undefined) {
  return classifyModel(model) === 'frontier'
}

export function suggestSmallerModel(model: string | null | undefined) {
  const normalizedModel = normalizeModelName(model)

  if (normalizedModel.startsWith('gpt-4') || normalizedModel.startsWith('gpt-5')) {
    return 'gpt-4o-mini'
  }
  if (normalizedModel.startsWith('claude-3-opus') || normalizedModel.startsWith('claude-3-7-sonnet')) {
    return 'claude-3-haiku'
  }
  if (normalizedModel.startsWith('gemini')) {
    return 'gemini-2.0-flash'
  }

  return 'a smaller model'
}

export interface ModelEnergyProfileRecord {
  model_identifier: string
  model_class: string
  provider: string | null
}

export function findBestEnergyProfileMatch<T extends ModelEnergyProfileRecord>(
  model: string,
  provider: string,
  candidates: T[]
) {
  const normalizedModel = normalizeModelName(model)
  const providerCandidates = candidates.filter((candidate) => candidate.provider === provider)
  const allCandidates = providerCandidates.length > 0 ? providerCandidates : candidates

  const sortedCandidates = [...allCandidates].sort(
    (left, right) => right.model_identifier.length - left.model_identifier.length
  )

  for (const candidate of sortedCandidates) {
    const normalizedIdentifier = normalizeModelName(candidate.model_identifier)
    if (matchesModelIdentifier(normalizedModel, normalizedIdentifier)) {
      return candidate
    }
  }

  const modelClass = classifyModel(normalizedModel)
  if (modelClass !== 'unknown') {
    const classMatchedCandidate =
      sortedCandidates.find((candidate) => candidate.model_class === modelClass) ??
      candidates.find((candidate) => candidate.model_class === modelClass)
    if (classMatchedCandidate) {
      return classMatchedCandidate
    }
  }

  return null
}
