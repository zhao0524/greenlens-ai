import test from 'node:test'
import assert from 'node:assert/strict'

import {
  classifyModel,
  findBestEnergyProfileMatch,
  isFrontierModel,
  suggestSmallerModel,
} from '../src/lib/analysis/model-classification'

test('classifyModel keeps gpt-4o-mini out of the frontier bucket', () => {
  assert.equal(classifyModel('gpt-4o-mini-2024-07-18'), 'small')
  assert.equal(isFrontierModel('gpt-4o-mini-2024-07-18'), false)
  assert.equal(isFrontierModel('gpt-4o-2024-08-06'), true)
})

test('findBestEnergyProfileMatch prefers the most specific model identifier', () => {
  const match = findBestEnergyProfileMatch('gpt-4o-mini-2024-07-18', 'openai', [
    { model_identifier: 'gpt-4o', model_class: 'frontier', provider: 'openai' },
    { model_identifier: 'gpt-4o-mini', model_class: 'small', provider: 'openai' },
  ])

  assert.equal(match?.model_identifier, 'gpt-4o-mini')
})

test('suggestSmallerModel returns a concrete alternative for frontier families', () => {
  assert.equal(suggestSmallerModel('claude-3-opus-20240229'), 'claude-3-haiku')
  assert.equal(suggestSmallerModel('gpt-5'), 'gpt-4o-mini')
})
