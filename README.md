# e8-vertico

Vertical completion for [E8](https://github.com/e8-editor/e8): with `vertico-mode` on, every prompt that completes lists its candidates down the minibuffer, one per line, with the first selected, and sorts them by history, length and name. A port of [vertico](https://github.com/minad/vertico) 2.5, with its `vertico-sort` extension.

## Installing

In `~/.config/e8/init.ts`:

```ts
e8.usePackage("e8-editor/e8-vertico");
e8.call("vertico-mode");
```

E8 installs it at its newest version tag into `repos/` beside `init.ts`, records the commit in `e8-lock.json`, and requires it. `M-x package-vc-upgrade` brings it up to date. Pin a version with `{ rev: "v0.1.0" }`. It needs E8 0.3.1 or newer.

Turning `vertico-mode` on turns off icomplete's modes and fido's, which would list the candidates too.

### With orderless and marginalia

vertico shows what the completion styles match and what the annotators say; it does neither itself. Two packages of their own, often used with it, do: [e8-orderless](https://github.com/e8-editor/e8-orderless), a completion style that matches space-separated words in any order, and [e8-marginalia](https://github.com/e8-editor/e8-marginalia), which annotates the candidates. A config that uses all three usually reads:

```ts
e8.usePackage("e8-editor/e8-vertico");
e8.usePackage("e8-editor/e8-orderless");
e8.usePackage("e8-editor/e8-marginalia");
e8.call("vertico-mode");
e8.call("marginalia-mode");
e8.setVariable("completion-styles", ["orderless", "basic"]);
```

## Using it

At any prompt that completes, such as `M-x`, `C-x b` or `C-x C-f`:

| Key | Does |
| --- | --- |
| `C-n`, `C-p`, `<down>`, `<up>` | the next and previous candidate |
| `M-<`, `M->` | the first and last candidate |
| `C-v`, `M-v` | a page of candidates on and back |
| `M-}`, `M-{` | the next and previous group, where the candidates are grouped |
| `TAB` | put the selected candidate in the input |
| `RET` | take the selected candidate |
| `M-RET` | take the input as typed, whatever is selected |
| `M-w` | copy the selected candidate |

The keys are those of `vertico-map`, which takes over the commands the minibuffer has on them.

Variables:

- `vertico-count`: how many candidates to show, 10.
- `vertico-cycle`: whether moving past the last candidate goes back to the first.
- `vertico-preselect`: what is selected first: `"first"`, `"prompt"` (the input), `"no-prompt"`, or `"directory"`, the first candidate unless the input is a directory, the default.
- `vertico-scroll-margin`: how many candidates to keep in sight above and below the selected one.
- `vertico-resize`: whether the minibuffer shrinks again as the candidates get fewer.
- `vertico-count-format`, `vertico-group-format`: how the count before the prompt and the groups' titles are shown.
- `vertico-sort-function`, `vertico-sort-override-function`: how the candidates are sorted: `vertico-sort-history-length-alpha` by default, or `vertico-sort-history-alpha`, `vertico-sort-length-alpha`, `vertico-sort-alpha`.

The faces are `vertico-current`, `vertico-group-title`, `vertico-group-separator` and `vertico-multiline`.

## Differences from vertico.el

- Of vertico's extensions only `vertico-sort` is here: `vertico-directory`, `vertico-multiform`, `vertico-repeat`, `vertico-buffer` and the rest are not ported.
- A group's title line is padded with spaces to the window's edge, not with a display space.
- The minibuffer grows as E8's echo area does, up to the whole frame while vertico lists candidates, rather than by vertico's own resizing.

## Credit

This is a port to E8 of [vertico](https://github.com/minad/vertico) 2.5, with its `extensions/vertico-sort.el`, by Daniel Mendler, copyright the Free Software Foundation, and distributed in GNU ELPA, under the GNU General Public License version 3 or later. It is not the upstream authors' work as published, and they do not endorse it: report problems with the port here, not upstream.

## Developing

With an E8 on your PATH (a [release](https://github.com/e8-editor/e8/releases), or built from source) and TypeScript 5.8 or newer:

```bash
make test
make types
```

The tests in `test/vertico-tests.ts` type the keys of each case in `test/cases.json` at a prompt and check, after each key, the input, the count and the candidates vertico shows, and the answer, against what vertico.el 2.5 showed in Emacs 30 for the same keys, recorded in `test/golden.json`. `test/record.el` records them again, in an Emacs on a terminal:

```bash
script -q /dev/null emacs -Q -nw -l test/record.el
```

It loads vertico from `~/.emacs.d/elpaca/repos/vertico`, or from the directory `E8_ELPA` names.

## Licence

GPL-3.0-or-later: see `LICENSE`.
