## Components outside npm

These are not npm dependencies, so they are not part of the generated list below. Some of them
are not bundled yet; their notice text is kept here so it is ready when they are.

### Vocabulary data (`data/`)

The HSK vocabulary in `data/` is distributed under CC BY-SA 4.0, separately from the AGPL code. It
is derived from complete-hsk-vocabulary (MIT), CC-CEDICT (CC BY-SA 4.0), Make Me a Hanzi
(LGPL-3.0-or-later) and SUBTLEX-CH (CC BY-SA 4.0). See [`data/NOTICE.md`](data/NOTICE.md) for the
full attribution and [`data/LICENSE`](data/LICENSE) for the license.

### CC-CEDICT

- Source: <https://cc-cedict.org/wiki/>, maintained by MDBG
  (<https://www.mdbg.net/chinese/dictionary?page=cc-cedict>)
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Use: the English meanings in `data/*.json`, and the reference for the Spanish definitions.

> Contains data from CC-CEDICT (MDBG, https://cc-cedict.org), licensed under CC BY-SA 4.0.
> Modified: HSK selection, reformatting and translation into Spanish.

### Stroke data: Make Me a Hanzi and hanzi-writer-data (planned)

Status: not bundled yet. Today the app loads stroke data at runtime from the jsDelivr CDN, so
MemoZi does not redistribute it. A later sprint will bundle the HSK 1-3 characters for offline use
as separate JSON files (not inside the JavaScript bundle), with `ARPHICPL.TXT` and the LGPL text
next to them, unmodified.

- Sources: [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) 2.0.1 by David
  Chanin, built from [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) by Shaunak Kishore
- Licenses:
  - stroke outlines and medians (`graphics.txt`): Arphic Public License 1999 (SPDX `Arphic-1999`),
    derived from the Arphic PL KaitiM GB and Arphic PL UKai fonts by Arphic Technology Co., Ltd.
    Text: <https://raw.githubusercontent.com/chanind/hanzi-writer-data/master/ARPHICPL.TXT>
  - radical stroke indices (`radStrokes`, computed from `dictionary.txt`): LGPL-3.0-or-later.
    Text: <https://www.gnu.org/licenses/lgpl-3.0.html>
- Notice to ship with the files and in the app's About screen:

> Stroke data: Make Me a Hanzi (© Shaunak Kishore), derived from fonts by Arphic Technology Co.,
> Ltd., under the Arphic Public License; radical data under LGPL-3.0-or-later. Distributed via
> hanzi-writer-data (© David Chanin).

If the files are ever merged, subset into one file or reformatted, that counts as a modification
under the Arphic Public License: each modified file needs a notice saying what changed and when,
and the generator script must be published under the same license.

### Noto Sans SC / Noto Serif SC (planned)

Status: not bundled yet. The CSS asks for `Noto Sans SC` and falls back to system fonts.

- Source: <https://github.com/notofonts/noto-cjk> (or the `@fontsource/noto-sans-sc` package)
- License: [SIL Open Font License 1.1](https://openfontlicense.org) (SPDX `OFL-1.1`)
- Notice: Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'.
- When bundled, ship `OFL.txt` with the font files. A subset font is a modified version: it stays
  under the OFL and must not use the reserved name "Source".
