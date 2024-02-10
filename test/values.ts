/**
 * @module
 * Pre-set values for usage in tests
 */

import type { StrictLilypondOpts } from '../src/invokeLilypond'

export const music = `d4 e f g`
export const binary = '/usr/bin/env lilypond'
export const version = '2.24'
export const opts: StrictLilypondOpts = {
  crop: false,
  dpi: null,
  binary,
  version,
  formats: ['svg'],
  midi: true,
}
export const file = '/tmp/lilypond-123456/score.ly'
