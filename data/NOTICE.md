# Data notice

The vocabulary files in this directory (`data/*.json`) are **not** covered by the AGPL-3.0 license
of the MemoZi source code. They are distributed under the
[Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/)
license (CC BY-SA 4.0). The full legal code is in [`LICENSE`](./LICENSE) next to this file.

The same license applies to any data added here later, including the Spanish definitions, because
they are adaptations of material that is itself under CC BY-SA 4.0 (see CC-CEDICT below).

## What is in here

| File        | Content                    | Status                                              |
| ----------- | -------------------------- | --------------------------------------------------- |
| `1.json`    | HSK 2.0 level 1 vocabulary | In scope                                            |
| `2.json`    | HSK 2.0 level 2 vocabulary | In scope                                            |
| `3.json`    | HSK 2.0 level 3 vocabulary | In scope                                            |
| `4.json`    | HSK 2.0 level 4 vocabulary | Out of scope; kept only until a later cleanup story |
| `LICENSE`   | CC BY-SA 4.0 legal code    |                                                     |
| `NOTICE.md` | This file (attribution)    |                                                     |

MemoZi covers HSK 2.0 levels 1-3. `4.json` is not used by the app and will be removed in a later
cleanup story; until then it is redistributed under the same terms as the other files.

## Changes made

The files are copies of `wordlists/exclusive/old/{1..4}.json` from complete-hsk-vocabulary. MemoZi
selects the HSK 2.0 levels it teaches and may reformat, filter or extend the entries (for example
by adding Spanish definitions). Those adaptations are redistributed under CC BY-SA 4.0.

## Attribution

### complete-hsk-vocabulary

- Source: <https://github.com/drkameleon/complete-hsk-vocabulary>
- Author: Yanis Zafirópulos
- License of the compilation and its scripts: [MIT](https://github.com/drkameleon/complete-hsk-vocabulary/blob/main/LICENSE)
  (notice reproduced below)
- Used for: the word lists and every field of each entry, as published by that project.

The MIT license covers the work of that project. It does not change the license of the upstream
material it collects, listed below; the English meanings in particular remain under CC BY-SA 4.0,
which is why this directory as a whole is CC BY-SA 4.0.

```text
MIT License

Copyright (c) 2026 Yanis Zafirópulos

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### CC-CEDICT

- Source: <https://cc-cedict.org/wiki/>, maintained by MDBG (<https://www.mdbg.net/chinese/dictionary?page=cc-cedict>)
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Used for: the English meanings (`forms[].meanings`).
- Changes: selection of the HSK entries, reformatting into JSON by complete-hsk-vocabulary, and,
  in MemoZi, use as a reference for the Spanish definitions.

### Make Me a Hanzi

- Source: <https://github.com/skishore/makemeahanzi> (`dictionary.txt`), by Shaunak Kishore
- License: [LGPL-3.0-or-later](https://www.gnu.org/licenses/lgpl-3.0.html), see the project's
  [`COPYING`](https://github.com/skishore/makemeahanzi/blob/master/COPYING)
- Used for: the `radical` field.
- To the extent that field is protected at all (it names the radical of each character), it is
  also available under the LGPL-3.0-or-later terms of its source.

### SUBTLEX-CH

- Source: Cai, Q. and Brysbaert, M. (2010). _SUBTLEX-CH: Chinese Word and Character Frequencies
  Based on Film Subtitles._ PLoS ONE 5(6): e10729. <https://doi.org/10.1371/journal.pone.0010729>
- Data: <http://crr.ugent.be/programs-data/subtitle-frequencies/subtlex-ch>
- License: CC BY-SA 4.0, as listed by
  [krmanik/HSK-3.0-words-list](https://github.com/krmanik/HSK-3.0-words-list/blob/main/License.md)
- Used for: part of the part-of-speech tags (`pos`).

### Other upstream sources of complete-hsk-vocabulary

These contribute factual fields (word lists, frequencies, transcriptions) and are credited for
completeness:

- [clem109/hsk-vocabulary](https://github.com/clem109/hsk-vocabulary) (MIT): HSK 2.0 word lists.
- [krmanik/HSK-3.0-words-list](https://github.com/krmanik/HSK-3.0-words-list): `frequency`.
- [HanLP](https://github.com/hankcs/HanLP) (Apache-2.0): part of the part-of-speech tags.

## Not in this directory

Stroke data (Make Me a Hanzi / hanzi-writer-data, Arphic Public License and LGPL-3.0-or-later) and
fonts (Noto, SIL OFL 1.1) are not bundled yet. They will ship as separate files, each with its own
license file, and are described in [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).
