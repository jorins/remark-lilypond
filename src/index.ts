/**
 * @packageDocumentation
 *
 * This is the index of the module. It exposes the plugin as the named export
 * `plugin` as well as the default export. The configuration interface is
 * available as `RemarkLilypondConfiguration`
 */

export type { RemarkLilypondConfig } from './plugin'
import { remarkLilypond } from './plugin'

/**
 * This is the plugin itself. You can import whichever way you see fit:
 *
 * ```typescript
 * // Named import
 * import { plugin } from 'remark-lilypond'
 * import { plugin as lilypond } from 'remark-lilypond'
 *
 * // Default import
 * import lilypond from 'remark-lilypond'
 * ```
 *
 * You can then use it in your remark configuration.
 *
 * For example, with Next.js and Nextra:
 *
 * ```javascript
 * import nextra from 'nextra'
 * import lilypond from 'remark-lilypond'
 *
 * /** @type { import('next').NextConfig } *\/
 * const nextConfig = { ... }
 *
 * /** @type { import('remark-lilypond').RemarkLilypondConfig } *\/
 * const lilypondConfig = {
 *   strategy: 'inline-svg'
 * }
 *
 * /** @type { import('nextra').NextraConfig } *\/
 * const nextraConfig = {
 *   ...
 *   mdxOptions: {
 *     remarkPlugins: [
 *       [lilypond, lilypondConfig],
 *     ],
 *   },
 * }
 *
 * export default nextra(nextraConfig)(nextConfig)
 * ```
 */
export const plugin = remarkLilypond

export default plugin
