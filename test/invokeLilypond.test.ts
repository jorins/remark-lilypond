import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { invokeLilypond } from '../src/invokeLilypond'
import { exec } from '../src/util'
import { music, score, opts } from './values'

const scoreDir = mkdtemp(join(tmpdir(), 'lilypondTest-'))

beforeAll(async () => {
  // Build reference scores
  const scorePath = join(await scoreDir, 'score')

  const lilypondBin = process.env['LILYPOND_BIN'] ?? '/usr/bin/env'
  const lilypondArg = lilypondBin === '/usr/bin/env' ? ['lilypond'] : []

  await exec(
    lilypondBin,
    [
      ...lilypondArg,
      '--format=png',
      '--define-default=crop',
      '--define-default=no-point-and-click',
      `--output=${scorePath}`,
      '-',
    ],
    undefined,
    score,
  )

  await exec(
    lilypondBin,
    [
      ...lilypondArg,
      '--format=svg',
      '--define-default=crop',
      '--define-default=no-point-and-click',
      `--output=${scorePath}`,
      '-',
    ],
    undefined,
    score,
  )
})

afterAll(async () => {
  return rm(await scoreDir, { recursive: true })
})

describe(invokeLilypond, () => {
  it('gives the expected png output', async () => {
    const expectedPath = join(await scoreDir, 'score.png')
    const expectedPromise = readFile(expectedPath)
    const invocation = invokeLilypond(music, {
      ...opts,
      formats: ['png'],
      crop: false,
    })

    const res = (await invocation).outputs.png
    const expected = await expectedPromise

    expect(res?.length).toEqual(expected.length)
    expect(res?.equals(expected)).toBe(true)
  })

  it('gives the expected cropped png output', async () => {
    const expectedPath = join(await scoreDir, 'score.cropped.png')
    const expectedPromise = readFile(expectedPath)
    const invocation = invokeLilypond(music, {
      ...opts,
      formats: ['png'],
      crop: true,
    })

    const res = (await invocation).outputs['cropped.png']
    const expected = await expectedPromise

    expect(res?.length).toEqual(expected.length)
    expect(res?.equals(expected)).toBe(true)
  })

  it('gives the expected svg output', async () => {
    const expectedPath = join(await scoreDir, 'score.svg')
    const expectedPromise = readFile(expectedPath)
    const invocation = invokeLilypond(music, {
      ...opts,
      formats: ['svg'],
      crop: false,
    })

    const res = (await invocation).outputs.svg
    const expected = await expectedPromise

    expect(res?.length).toEqual(expected.length)
    expect(res?.equals(expected)).toBe(true)
  })

  it('gives the expected cropped svg output', async () => {
    const expectedPath = join(await scoreDir, 'score.cropped.svg')
    const expectedPromise = readFile(expectedPath)
    const invocation = invokeLilypond(music, {
      ...opts,
      formats: ['svg'],
      crop: true,
    })

    const res = (await invocation).outputs['cropped.svg']
    const expected = await expectedPromise

    expect(res?.length).toEqual(expected.length)
    expect(res?.equals(expected)).toBe(true)
  })

  it('gives the expected MIDI output', async () => {
    const expectedPath = join(await scoreDir, 'score.midi')
    const expectedPromise = readFile(expectedPath)
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
    const expectedPath = join(await scoreDir, 'score.svg')
    const expectedPromise = readFile(expectedPath)
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
