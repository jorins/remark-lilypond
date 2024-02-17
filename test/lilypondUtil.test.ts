import type { StrictLilypondOpts } from '../src/invokeLilypond'

import { describe, it, expect } from '@jest/globals'
import { wrapMusic, validateOptions, computeArgs } from '../src/lilypondUtil'
import { multiline } from '../src/util'
import { music, opts, outputPath } from './values'

describe('Lilypond utilities', () => {
  describe(wrapMusic, () => {
    it('wraps in a score without outputs when no format is given MIDI is not requested', () => {
      const res = wrapMusic(music, { ...opts, formats: [], midi: false })
      expect(res).toEqual(
        multiline(`\\version "2.24"`, `\\score {`, `  { ${music} }`, `}`),
      )
    })

    it('wraps in a score with only \\layout when PDF is the only given format and MIDI is not requested', () => {
      const res = wrapMusic(music, { ...opts, formats: ['pdf'], midi: false })
      expect(res).toEqual(
        multiline(
          `\\version "2.24"`,
          `\\score {`,
          `  { ${music} }`,
          `  \\layout { }`,
          `}`,
        ),
      )
    })

    it('wraps in a score with only \\layout when formats are PDF and PNG and MIDI is not requested', () => {
      const res = wrapMusic(music, {
        ...opts,
        formats: ['pdf', 'png'],
        midi: false,
      })
      expect(res).toEqual(
        multiline(
          `\\version "2.24"`,
          `\\score {`,
          `  { ${music} }`,
          `  \\layout { }`,
          `}`,
        ),
      )
    })

    it('wraps in a score with only \\midi when no graphical format is given and MIDI is requested', () => {
      const res = wrapMusic(music, { ...opts, formats: [], midi: true })
      expect(res).toEqual(
        multiline(
          `\\version "2.24"`,
          `\\score {`,
          `  { ${music} }`,
          `  \\midi { }`,
          `}`,
        ),
      )
    })

    it('wraps in a score with both \\layout and \\midi when PDF is the only given format and MIDI is requested', () => {
      const res = wrapMusic(music, { ...opts, formats: ['pdf'], midi: true })
      expect(res).toEqual(
        multiline(
          `\\version "2.24"`,
          `\\score {`,
          `  { ${music} }`,
          `  \\layout { }`,
          `  \\midi { }`,
          `}`,
        ),
      )
    })

    it('throws when given input that already contains \\score', () => {
      const test = () =>
        wrapMusic(wrapMusic(music, { ...opts, formats: ['pdf'], midi: true }), {
          ...opts,
          formats: ['png'],
        })

      expect(test).toThrowError(
        /^Asked to wrap music but input already contains \\version:/,
      )
    })
  })

  describe(validateOptions, () => {
    it('passes with formats as SVG only', () => {
      const test = () =>
        validateOptions({
          ...opts,
          formats: ['svg'],
        })
      expect(test).not.toThrow()
    })

    it('passes with formats as SVG and MIDI', () => {
      const test = () =>
        validateOptions({
          ...opts,
          formats: ['svg'],
          midi: true,
        })
      expect(test).not.toThrow()
    })

    it('passes with formats as PDF and PNG', () => {
      const test = () =>
        validateOptions({
          ...opts,
          formats: ['pdf', 'png'],
        })
      expect(test).not.toThrow()
    })

    it('fails with formats as SVG and PDF ', () => {
      const test = () =>
        validateOptions({
          ...opts,
          formats: ['svg', 'pdf'],
        })
      const expected =
        'Invalid value at formats, expected ["svg"] | array<"pdf" | "png">, got array<"svg" | "pdf">'
      expect(test).toThrowError(expected)
    })
  })

  describe(computeArgs, () => {
    type Test = {
      name: string
      opts: StrictLilypondOpts
      outputPath: string
      expected: string[]
    }

    const tests: Test[] = [
      {
        name: 'SVG only',
        opts: {
          ...opts,
          formats: ['svg'],
        },
        outputPath,
        expected:
          `--format=svg --define-default=no-point-and-click --output="score" -`.split(
            ' ',
          ),
      },

      {
        name: 'SVG and MIDI',
        opts: {
          ...opts,
          formats: ['svg'],
          midi: true,
        },
        outputPath,
        expected:
          `--format=svg --define-default=no-point-and-click --output="score" -`.split(
            ' ',
          ),
      },

      {
        name: 'PDF, PNG, and MIDI',
        opts: {
          ...opts,
          formats: ['pdf', 'png'],
          midi: true,
        },
        outputPath,
        expected:
          `--format=pdf --format=png --define-default=no-point-and-click --output="score" -`.split(
            ' ',
          ),
      },

      {
        name: 'MIDI only',
        opts: {
          ...opts,
          formats: [],
          midi: true,
        },
        outputPath,
        expected:
          `--define-default=no-point-and-click --output="score" -`.split(' '),
      },
    ]

    it.each(tests)(
      'generates expected command line for $name',
      ({ opts, outputPath, expected }) => {
        expect(computeArgs(opts, outputPath)).toEqual(expected)
      },
    )
  })
})
