# Writing the guide text

GuShot captures the images; you write the text. These rules keep the text and the images in step, and keep them in step after the next UI change.

## Before writing

- **Read the project's style file first** if it has one (for example `juklak-style.md`, `docs/STYLE.md`). It sets the language rules (spelling standard, punctuation, chapter format) and what each action means for each kind of record (for example "check out an Application to a User" = assign its Product Owner). Follow it over anything here. If there is none and the guide needs such rules, ask the user instead of guessing, and offer to write the file.
- **Pick one main scenario**: one set of sample records that runs through the whole chapter (create a laptop, check it out to a user, check it back in). Readers follow one story, and the data in each image matches the one before it.
- **Features the scenario does not reach** (another record type, an empty table, check out to a location) get their own subsection after the main flow, titled "Variation: ..." in the guide's language, with their own clearly separate sample data. Do not bend the main story to show them.

## Kind of subsection

Name the kind before writing; each has its own pattern.

| Kind | Use for | Pattern |
|---|---|---|
| Procedure | doing a task | goal (one sentence), numbered steps, result (what the reader sees when it worked) |
| Page tour | what a page shows | one whole-page image with numbered markers, then a numbered list of the areas |
| Field reference | a form with many fields | table: field, what to enter, required or not |
| Checklist | things to confirm before or after a task | short bulleted list, no images unless one is needed |

## Images and step numbers

- Use numbered markers (`highlight` with `label`) whenever one image belongs to two or more steps. One step, one control: a plain box is enough.
- A marker's number is the step number in the text (see SKILL.md, step 4).
- Put each step's short text in that marker's `text` (written only by `--md`) or `note` (also drawn as a callout; fine for one or two markers, crowded on a form), and the image caption in `caption`. The caption then lives only in the config; `--md` writes it next to the image, so do not type it a second time by hand.

## Diagrams

- Add a flow diagram (for example Mermaid) only where text and screenshots cannot show it well: a procedure that branches (a Yes/No decision, a loop back to fix errors), the order in which records must be created, or how records refer to each other. A straight sequence of steps stays a numbered list.
- Follow the project's style file: if it asks for diagrams, write them; if it forbids them, do not.
- Check that the project's PDF or site builder renders the diagram. If it does not (raw code would show in the PDF), use a numbered list or a table instead.
- Number and caption a diagram like an image ("Figure 6.1 ...") and mention it in the text before it, so the reader knows why it is there.
- Keep it small: one diagram per idea, labels taken from the screen (same button and menu names as the text).

## Keep labels honest

Every button, menu, or field name the text quotes must match the screen. For each one, add a `waitText` step to the shot that shows it. When the label changes in the app, `--check` fails on that shot and tells you which text to update.

## Use the skeleton

Run with `--md guide-skeleton.md` to get, per shot: its name as heading, image, the caption as an italic line under it, numbered steps. Keep the `shots` in the config in the same order as the images in the guide, so the skeleton reads in guide order. The file is overwritten on every run, so do not edit it: copy from it into the real guide, and add the goal, result, and explanation there. After a UI change, rerun, diff the skeleton, and update only the parts that changed.

## Version and revision history

- Every guide starts with a document control block: document version, date, and the version of the app it describes. Below it, a "Revision history" table: version, date, sections changed, reason.
- Keep the version in the config: `"guide": { "version": "1.0", "appVersion": "..." }`. Whenever images come back `changed` or `new`, or the text changes, raise `guide.version` and add one row. GuShot reminds you (`Images changed since version 1.0; raise guide.version`) when images changed but the version did not; it never edits the config itself.
- With `guide` set, the `--md` skeleton starts with front matter (`version`, `date`, `appVersion`) and a suggested revision row in an HTML comment, built from the changed and new shots. Copy the front matter to the top of the guide, so the project's PDF or site builder can print the version on the cover. Turn the suggested row into a real row: map shot names to the sections that use them and write the reason.
- Add rows, never rewrite old ones.
- The numbering and the labels (for example "Versi 1.1", "Riwayat Revisi") come from the project's style file. Without one: `1.0` for the first issue, `+0.1` for an update, `+1.0` for a rewrite.

## Check before you finish

- Open every image reported `new` or `changed`, not a sample: markers on the right control, numbers match the text, blur and `replaceText` applied, nothing cut off.
- Each step in the text that points at something on screen has a marker in its image.

## PDF

GuShot does not build PDFs. Use the project's own builder, or Pandoc (`pandoc guide.md -o guide.pdf`), or print the rendered Markdown from the browser.
