import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildModeledProviderSpend,
  calculateModeledCost,
  findModelPricing,
} from '../src/lib/billing/modeled-spend'

test('calculateModeledCost uses the current pricing table for matched OpenAI models', () => {
  const cost = calculateModeledCost({
    model: 'gpt-4o',
    provider: 'openai',
    totalInputTokens: 1_000_000,
    totalOutputTokens: 200_000,
    totalRequests: 100,
  })

  assert.equal(cost, 4.5)
})

test('buildModeledProviderSpend prices Anthropic usage when Claude models are present', () => {
  const [anthropicSpend] = buildModeledProviderSpend([
    {
      model: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      totalInputTokens: 2_000_000,
      totalOutputTokens: 1_000_000,
      totalRequests: 42,
    },
  ])

  assert.equal(anthropicSpend.provider, 'anthropic')
  assert.equal(anthropicSpend.estimatedAnnualCost, 21)
  assert.equal(anthropicSpend.pricingCoverage, 'modeled')
  assert.equal(anthropicSpend.modeledModelCount, 1)
  assert.equal(anthropicSpend.coverageRate, 100)
})

test('buildModeledProviderSpend marks partially-priced providers when some models are unmatched', () => {
  const [openaiSpend] = buildModeledProviderSpend([
    {
      model: 'gpt-4o-mini',
      provider: 'openai',
      totalInputTokens: 1_000_000,
      totalOutputTokens: 500_000,
      totalRequests: 300,
    },
    {
      model: 'legacy-openai-model',
      provider: 'openai',
      totalInputTokens: 1_000_000,
      totalOutputTokens: 0,
      totalRequests: 50,
    },
  ])

  assert.equal(openaiSpend.pricingCoverage, 'partial')
  assert.equal(openaiSpend.modeledModelCount, 1)
  assert.equal(openaiSpend.modelCount, 2)
  assert.equal(openaiSpend.coverageRate, 60)
  assert.ok(Math.abs((openaiSpend.estimatedAnnualCost ?? 0) - 0.45) < 1e-9)
})

test('findModelPricing prefers the provider-specific match for prefixed identifiers', () => {
  const pricing = findModelPricing('gpt-4.1-mini-2025-04-14', 'openai')

  assert.ok(pricing)
  assert.equal(pricing?.model_identifier, 'gpt-4.1-mini')
  assert.equal(pricing?.provider, 'openai')
})
