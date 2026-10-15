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

The skeleton is overwritten on every run. Copy from it into your real guide and write the rest (goal, result, explanations) there. After a UI change, rerun and compare the skeleton with git to see which steps changed.

| 01_orders | 02_order_form |
|---|---|
| ![](screenshots/01_orders.png) | ![](screenshots/02_order_form.png) |

How to structure the text itself (kinds of subsection, one main scenario, when markers are required) is in [writing.md](../../skills/guide-screenshots/references/writing.md).
