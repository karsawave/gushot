# 7. Keeping the guide text with the screenshots

**English** · [Bahasa Indonesia](guide-text.id.md)

GuShot does not write your guide, but it can keep the parts of the text that belong to an image (its caption and the numbered steps) in the same config as the image. After a UI change you rerun one command and get both back.

## The config

[example.json](example.json) adds three things to what tutorial 3 showed:

```json
"replaceText": { "Budi Santoso": "Sample Customer A", "Siti Aminah": "Sample Customer B" },
"shots": [
  { "name": "01_orders", "caption": "The Recent orders page",
    "steps": [{ "waitText": "Recent orders" }, { "waitText": "New order" }],
    "highlight": [{ "selector": "#new-order", "label": "1", "note": "Click New order" }] },
  { "name": "02_order_form", "caption": "Filling in a new order",
    "highlight": [
      { "selector": "#cust", "label": "2", "text": "Choose the Customer" },
      { "selector": ".modal .primary", "label": "5", "text": "Click Save order" }
    ] }
]
```

- `caption` is the image caption, written once.
- A marker's `note` is drawn on the image and goes into the text. `text` goes into the text only. Use `text` on busy forms, where callouts would cover the field labels.
- `replaceText` swaps real names for sample ones. Unlike blur, the reader can still read the column.
- `waitText` for every label the steps quote: when the app renames "New order", `--check` fails on this shot.

## Run it

```bash
cd docs/guide-text
APP_PASSWORD=demo node ../../skills/guide-screenshots/scripts/shot.cjs example.json --md guide-skeleton.md
```

[guide-skeleton.md](guide-skeleton.md) gets one section per shot:

```markdown
## 02_order_form

![Filling in a new order](screenshots/02_order_form.png)

*Filling in a new order*

2. Choose the Customer
3. Choose the Item
4. Enter the Quantity
5. Click Save order
```

With `"guide": { "version": "1.0" }` in the config (as in this example), the skeleton starts with front matter (`version`, `date`) that a PDF or site builder can print on the cover, and suggests a revision-history row. When images change but the version stays the same, GuShot reminds you to raise it.

The skeleton also has a line such as `> GuShot run 2026-10-15: changed: 02_order_form`. Use it for the guide's revision history: raise the document version and add a row for the sections that use those images.

The skeleton is overwritten on every run. Copy from it into your real guide and write the rest (goal, result, explanations) there. After a UI change, rerun and compare the skeleton with git to see which steps changed.

| 01_orders | 02_order_form |
|---|---|
| ![](screenshots/01_orders.png) | ![](screenshots/02_order_form.png) |

## Numbering the figures

Write the caption without a number and let GuShot count:

```json
"captionNumber": "Figure {chapter}.{n}",
"shots": [
  { "name": "01_orders", "chapter": 2, "caption": "The Recent orders page" },
  { "name": "02_order_form", "caption": "Filling in a new order", "skipNumbers": 1 }
]
```

This gives "Figure 2.1 The Recent orders page" and "Figure 2.3 Filling in a new order". Number 2.2 is left for a diagram written in the guide. When a shot is added in the middle, the numbers after it move up by themselves; run `--guide` to find the captions in the guide that still have the old number.

## Showing the version on the cover

Copy the skeleton's front matter to the very top of your guide (nothing may come before the first `---`). Most Markdown tools read it:

| Tool | How to show the version |
|---|---|
| Pandoc | the block becomes document metadata; the default PDF template prints `date` on the title page. For the version, use `$version$` in your own template (`pandoc guide.md -o guide.pdf --template cover.tex`) |
| VitePress | write `Version {{ $frontmatter.version }}` in the page |
| MkDocs | use `{{ page.meta.version }}` in a theme override template |
| Your own script | read the lines between the first two `---` lines as `key: value`, then remove the block before converting the Markdown |

Use `date` from the front matter rather than the day the PDF is built, so a rebuild without changes keeps the same date.

## A PDF with page numbers in the table of contents

Chrome cannot fill page numbers into a table of contents by itself. If you turn the guide into HTML (your own script, or `pandoc guide.md -s --toc -o guide.html`), GuShot prints it and fills them in:

```bash
node ../../skills/guide-screenshots/scripts/shot.cjs --pdf guide.html guide.pdf
```

Every link to `#id` inside an element with class `toc` (or Pandoc's `id="TOC"`) gets its page number on the right (`<span class="toc-page">`, style it with your own CSS). A link whose target does not exist prints a `TOC` line. Without `@page` rules in your CSS the PDF is A4 with "page / pages" in the footer; with them, your page setup is used.

How to structure the text itself (kinds of subsection, one main scenario, when markers are required) is in [writing.md](../../skills/guide-screenshots/references/writing.md).
