# Content licence

Atlas has two licences:

| What | Licence |
| --- | --- |
| **Code**: everything not listed below (the Astro app, scripts, schema, workflows) | MIT, see [`LICENSE`](LICENSE) |
| **Content**: the dictionary itself, meaning the term files (`app/src/content/terms/**`), the articles (`app/src/content/articles/**`), the allowed-words lists (`app/content/allowed-words.*.txt`), and the data the site publishes from them (`/api/…`, the Anki files, `/graph.json`, `/search-index.json`, `/semantic/vectors.json`, the RSS feeds) | [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/); full legal text in [`LICENSE-CONTENT.txt`](LICENSE-CONTENT.txt) |
| **Third-party wordlists** (`app/content/wordlists/*.txt`) | CC BY-SA 4.0, © Hermit Dave, _FrequencyWords_; see [`app/content/wordlists/README.md`](app/content/wordlists/README.md) |

SPDX: code `MIT`; content `CC-BY-SA-4.0`.

## Attribution

When you reuse Atlas content, credit it like this and link the licence:

> Atlas, a bilingual technical dictionary, https://cmaintz.github.io/tech-atlas/ (CC BY-SA 4.0)

If you adapt it, share your adaptation under CC BY-SA 4.0 or a
[compatible licence](https://creativecommons.org/share-your-work/licensing-considerations/compatible-licenses).

## Why CC BY-SA 4.0

Decision A66 in [`design/AUTONOMOUS_DECISIONS.md`](design/AUTONOMOUS_DECISIONS.md):

- The Closed Vocabulary lint is built on CC BY-SA 4.0 wordlists, so ShareAlike keeps
  the whole content side under one licence that is compatible with them.
- It is the licence Wikipedia uses, so text can move between the two.
- It keeps derived dictionaries open.

**Still open for the owner:** some Danish security definitions were seeded from the
course compendium (_Cyber Security Fast Track_). Whether that wording needs the course
owner's permission or credit is not settled by this licence (DECISIONS_REVIEW U16).
