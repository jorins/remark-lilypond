import type { OutputFormat } from '../src/invokeLilypond'

import { readFile } from 'node:fs/promises'
import { describe, it, expect } from '@jest/globals'
import { invokeLilypond } from '../src/invokeLilypond'
import { music, score, opts } from './values'

describe(invokeLilypond, () => {
  const formats: OutputFormat[] = [
    // 'pdf', // PDF doesn't seem deterministic; this test doesn't work
    'png',
    'svg',
  ]

  it.each(formats)('gives the expected %s output', async format => {
    const expectedPromise = readFile(`test/bin/score.${format}`)
    const invocation = invokeLilypond(music, {
      ...opts,
      formats: [format],
      crop: false,
    })

    const res = (await invocation).outputs[format]
    const expected = await expectedPromise

    expect(res?.length).toEqual(expected.length)
    expect(res?.equals(expected)).toBe(true)
  })

  it.each(formats)('gives the expected cropped %s output', async format => {
    const expectedPromise = readFile(`test/bin/score.cropped.${format}`)
    const invocation = invokeLilypond(music, {
      ...opts,
      formats: [format],
      crop: true,
    })

    const res = (await invocation).outputs[format]
    const expected = await expectedPromise

    expect(res?.length).toEqual(expected.length)
    expect(res?.equals(expected)).toBe(true)
  })

  it('gives the expected MIDI output', async () => {
    const expectedPromise = readFile(`test/bin/score.midi`)
    const invocation = invokeLilypond(music, {
      ...opts,
      formats: [],
      midi: true,
    })

    const res = (await invocation).midi
    const expected = await expectedPromise

    expect(res?.length).toEqual(expected.length)
    expect(res?.equals(expected)).toBe(true)
  })

  it('handles pre-wrapped input when wrap: false', async () => {
    const expectedPromise = readFile(`test/bin/score.svg`)
    const invocation = invokeLilypond(score, {
      ...opts,
      formats: ['svg'],
      wrap: false,
    })

    const res = (await invocation).outputs.svg
    const expected = await expectedPromise

    expect(res?.length).toEqual(expected.length)
    expect(res?.equals(expected)).toBe(true)
  })
})
