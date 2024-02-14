/**
 * @module
 * Pre-set values for usage in tests
 */

import type { StrictLilypondOpts } from '../src/invokeLilypond'

export const score = `\\version "2.24"

\\score {
  {
    d4 e f g
  }
  \\layout { }
  \\midi { }
}`

export const music = `d4 e f g`
export const binary = '/usr/bin/env lilypond'
export const version = '2.24'
export const opts: StrictLilypondOpts = {
  binary,
  version,
  crop: false,
  wrap: true,
  midi: true,
  formats: [],
  dpi: null,
}
export const file = '/tmp/lilypond-123456/score.ly'
