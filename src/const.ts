/**
 * @module
 * Constants for use in the codebase
 */

//
// Formats
//

/**
 * A list of formats that may be used in the project
 */
export const FORMAT = [
  'eps',
  'jpeg',
  'midi',
  'oga',
  'opus',
  'pdf',
  'png',
  'ps',
  'svg',
  'wav',
] as const

/**
 * A map of mime types
 */
export const MIME_TYPE = {
  eps: 'application/eps',
  jpeg: 'image/jpeg',
  midi: 'audio/midi',
  oga: 'audio/off',
  opus: 'audio/opus',
  pdf: 'application/pdf',
  png: 'image/png',
  ps: 'application/postscript',
  svg: 'image/svg+xml',
  wav: 'audio/wav',
} as const satisfies Record<(typeof FORMAT)[number], string>

//
// Binaries
//

/** Indicates usage of `env` binary as found in POSIX systems */
export const USE_ENV_BINARY = Symbol('USE_ENV_BINARY')

/** Path of `env` on POSIX systems */
export const ENV_PATH = '/usr/bin/env'

/** Default path to use on Windows */
export const WIN32_DEFAULT_PATH = 'lilypond.exe'

//
// Misc.
//

/** Filename used when interacting with filesystem */
export const FILENAME = 'score'
