import { describe, it, expect, jest } from '@jest/globals'
import { parseMeta } from '../src/parseMeta'

describe(parseMeta, () => {
  it('gives an empty object from an empty string', () => {
    expect(parseMeta('')).toEqual({})
  })

  it('validates strategy values', () => {
    expect(() => parseMeta('strategy=img-svg')).not.toThrow()
    expect(() => parseMeta('strategy=img-png')).not.toThrow()
    expect(() => parseMeta('strategy=inline-svg')).not.toThrow()
    expect(() => parseMeta('strategy=video-mp4')).toThrowError(
      `Invalid strategy 'video-mp4'`,
    )
  })

  it('parses strategy', () => {
    expect(parseMeta('strategy=img-svg')).toEqual({ strategy: 'img-svg' })
  })

  it('passes through binary value', () => {
    const binary = '/home/jorin/LilyPond/lilypond'
    expect(parseMeta(`binary=${binary}`)).toEqual({ binary })
  })

  it('passes through version value', () => {
    const version = '2.20'
    expect(parseMeta(`version=${version}`)).toEqual({ version })
  })

  it('sets crop by keyword', () => {
    expect(parseMeta('crop')).toEqual({ crop: true })
    expect(parseMeta('nocrop')).toEqual({ crop: false })
  })

  it('sets wrap by keyword', () => {
    expect(parseMeta('wrap')).toEqual({ wrap: true })
    expect(parseMeta('nowrap')).toEqual({ wrap: false })
  })

  it('parses DPI', () => {
    expect(parseMeta('dpi=300')).toEqual({ dpi: 300 })
    expect(() => parseMeta('dpi=nope')).toThrowError(
      `Failed to parse DPI value 'nope' as integer`,
    )
  })

  it('warns on unhandled keys', () => {
    const key = 'unhandled'
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    parseMeta(key)
    expect(warn).toBeCalledWith(`Unhandled LilyPond option '${key}'`)
  })

  it('handles multiple options', () => {
    expect(parseMeta('crop dpi=300 binary=/lilypond')).toEqual({
      crop: true,
      dpi: 300,
      binary: '/lilypond',
    })
  })
})
