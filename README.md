A Remark plugin to render LilyPond music notation, turning this...

    ```lilypond
    \relative d' {
      d4 e f a
    }
    ```

... into this

![Sheet music of a measure of quarter notes: D, E, F, A](media/renderedSample.png 'Sample of rendered sheet music')

# ⚠️ Security notice ⚠️

**This plugin is not safe for use with untrusted input.**

This plugin does **not** sanitise input or use LilyPond's `--jail` feature.
Building arbitrary scores **will** lead to remote code execution
vulnerabilities. Only use this plugin with inputs written by people you trust.

# Links

- [GitHub repository](https://github.com/jorins/remark-lilypond)
- [npmjs.com package](https://www.npmjs.com/package/remark-lilypond)
- [Documentation](https://jorins.github.io/remark-lilypond/)

# Features

- Render LilyPond code blocks as actual notation
- Output inline SVG, SVG `<img />` tags, or PNG `<img />` tags
- Configuration can be set globally and overridden per snippet

# Planned features

## Release 1.0

- Render PDF embedded using `<embed />` tag

## Future releases

- Render MIDI outputs using soundfonts to enable audio playback of scores
- Image processing pipeline

# Limitations

- Rendering can only be done server-side as it requires running the LilyPond
  binary.
- The plugin currently works by hijacking [mdx's](https://mdxjs.com/) mdast
  types. This means that **you currently need to use mdx to use the plugin**.
  This is a makeshift solution intended to be replaced in time for a 1.0
  release.
- This project is presently only tested on Linux. Windows and Mac _should_
  work, but this is not confirmed.

# Installation

`remark-lilypond` is distributed via
[npmjs.com](https://www.npmjs.com/package/remark-lilypond). To install it, run

```sh
# npm
npm install remark-lilypond

# yarn
yarn add remark-lilypond

# pnpm
pnpm add remark-lilypond
```

You also need to have the LilyPond binary available.

```sh
# Debian/Ubuntu
sudo apt install lilypond

# MacOS X
brew install lilypond

# Windows (chocolatey)
choco install lilypond
```

# Usage

To use the plugin, import it from `remark-lilypond` and include it in your list
of remark plugins. The configuration type is also exported.

In a `.mdx` file, add a lilypond snippet:

    # My song

    Here's my song!

    ```lilypond
    \relative e' {
      e8. e f8 d8. d e8
    }
    ```

See [documentation](https://jorins.github.io/remark-lilypond/functions/plugin.html)

# Development

This project is managed using `pnpm`. After cloning, run `pnpm install`. This
should set up Git hooks via `husky` which help you keep your code tidy.

To see the list of available scripts, run `pnpm run`. A PR should pass `pnpm
format`, `pnpm lint`, and `pnpm test` and build with `pnpm build`. You can fix
formatting using `pnpm format:fix` and solve some linter issues using `pnpm
lint:fix`.

Code tests are run using `pnpm test`. Tests require the LilyPond binary to be
available. If it's not available at a standard path, use the `LILYPOND_BIN`
environment variable when testing. For example,

```sh
LILYPOND_BIN=/home/jorin/LilyPond/lilypond pnpm test
```

To test usage, build using `pnpm build` and package the module using `pnpm
pack`. Then install it into another project using e.g. `pnpm add
../remark-lilypond/remark-lilypond-0.2.0.tgz`.
