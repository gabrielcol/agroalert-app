# Notion mirrors

## Innovation Labs Academy x Civic Producthon

The discovery-week knowledge base linked from the [5 September mail](../emails/2026-09-05-echipe-si-alte-detalii.md).

- **Source:** https://app.notion.com/p/Innovation-Labs-Academy-x-Civic-Producthon-3c9b2fbebae98056bdc2feb694e223ee
- **Mirror:** [innovation-labs-academy/index.md](innovation-labs-academy/index.md)
- **Exported:** 2026-09-11 - 18 pages, 734 blocks, 31 images (22 MB)

### How it was exported

No Notion CLI exports a public page without a `token_v2` cookie or an integration token. The page is public, and Notion's web-app endpoint `POST /api/v3/loadPageChunk` serves public pages unauthenticated, so [`inbox/notion-export/export.py`](../../inbox/notion-export/export.py) walks that endpoint, renders each page to markdown and downloads every image into `innovation-labs-academy/images/`. Re-run with:

```bash
python3 inbox/notion-export/export.py \
  3c9b2fbebae98056bdc2feb694e223ee \
  resources/notion/innovation-labs-academy
```

Every one of the 31 image references resolves to a file on disk; no orphans.

### Page tree

- **index** - welcome, what to do, full to-do list, deadline 10 September 23:59
  - **ux-customer-discovery** - the theory track
    - user-experience, customer-discovery, experiments, personas
    - hypotheses-how-to-write-them, the-riskiest-assumption-matrix, customer-interviews
  - **learning-mechanics** - seven hands-on exercises
    - sort-the-examples, order-the-loop, tag-the-hypothesis-area, riskiest-assumption-matrix, rewrite-the-leading-question, spot-the-failure-then-explain-the-fix, interview-feedback
  - **assignments** - the two reviewed deliverables: Hypotheses, Interview Guide

### Known gaps

- Notion's built-in callout icons are asset paths, not emoji, so they are dropped.
- The 51 button blocks are dropped. They carry no text label in the API - the label lives in `crdt_data` and the button only fires a Notion automation.
- Database / collection views are not rendered; this page tree contains none.
- Any block type the renderer does not know leaves an `<!-- unhandled notion block: TYPE -->` marker, so a gap shows up in the mirror instead of vanishing. This export leaves none: all 18 block types present in the tree render, the 2 tables included.

### Contact from the page

Ana Ungureanu - ana.ungureanu@tech-lounge.ro, 0753152069.

### Linked video

The `ux-customer-discovery` page embeds a 57-minute Innovation Labs recording.
It is mirrored with its transcript in [../videos/](../videos/README.md).
