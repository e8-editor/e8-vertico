// SPDX-License-Identifier: GPL-3.0-or-later
//
// vertico's tests, with ERT. Each case of test/cases.json, replayed key by
// key, shows what vertico.el 2.5 with vertico-sort.el shows in Emacs 30, as
// test/record.el recorded it in test/golden.json: the input, the count
// before the prompt and the candidates after the input after each key, and
// the answer once the prompt closes. `make test` runs them in e8 --batch,
// as CI does.

import { ertDeftest, should, shouldEqual, shouldError } from "ert";
import "vertico";

/** One of test/cases.json: a prompt and the keys typed at it. */
interface Case {
  name: string;
  vars?: { [name: string]: e8.Value };
  collection?: string[];
  require_match?: boolean;
  history?: string[];
  default?: string;
  keys: string[];
}

/** What the prompt shows after a key, or the answer once it has closed. */
type Step = { exited: true; answer: string | null } | { input: string; before: string; after: string };

/** This repository's directory: the one on load-path that holds vertico.ts. */
function repoDir(): string {
  const path = e8.variable("load-path");
  const dirs = Array.isArray(path) ? path.map(String) : [];
  const dir = dirs.find((d) => e8.fileExists(e8.fileNameConcat(d, "vertico.ts")));
  if (dir === undefined) throw new Error("vertico.ts is not on load-path");
  return dir;
}

function readJson<T>(name: string): T {
  return JSON.parse(e8.readTextFile(e8.fileNameConcat(repoDir(), "test", name))) as T;
}

function text(v: e8.Value | undefined): string {
  if (typeof v === "string") return v;
  if (v !== null && typeof v === "object" && "string" in v && typeof v.string === "string") return v.string;
  return "";
}

/**
 * What overlays show in the minibuffer, which is current: the
 * before-strings of those at its start and the after-strings of those at
 * its end, as vertico shows its count and its candidates.
 */
function minibufferStrings(): [string, string] {
  const start = e8.pointMin();
  const end = e8.pointMax();
  const overlays = e8
    .overlaysIn(start, end)
    .map((o) => ({ o, priority: Number(e8.overlayGet(o, "priority") ?? 0) }))
    .sort((a, b) => a.priority - b.priority || a.o - b.o)
    .map(({ o }) => o);
  const strings = (name: string, at: (o: number) => number | undefined, pos: number) =>
    overlays
      .filter((o) => at(o) === pos)
      .map((o) => text(e8.overlayGet(o, name)))
      .join("");
  return [strings("before-string", e8.overlayStart, start), strings("after-string", e8.overlayEnd, end)];
}

/**
 * Types `keys`, the first of which opens a prompt, in one keyboard macro,
 * as a prompt left open when the keys run out would read from stdin. What
 * the prompt shows after each key is seen before the next runs, from
 * pre-command-hook; `snapshot` says what to keep of it, in `seen`.
 */
function typeAtPrompt<T>(keys: string[], snapshot: () => T, seen: T[] = []): T[] {
  const hook = () => {
    if (e8.minibufferDepth() > 0) seen.push(snapshot());
  };
  e8.addHook("pre-command-hook", hook);
  try {
    e8.executeKbdMacro(keys.join(" "));
  } finally {
    e8.removeHook("pre-command-hook", hook);
  }
  return seen;
}

/** What <f5> reads with: the prompt of the case being replayed. */
let reader: () => string = () => "";
e8.defineVariable({ name: "cr-answer", value: null });
e8.defineVariable({ name: "cr-history", value: [] });
e8.bindKey("<f5>", e8.defineCommand({ name: "cr-read", run: () => e8.setVariable("cr-answer", reader()) }));

/** Replays a case as test/record.el does in Emacs, giving what the prompt showed after each key. */
function replay(c: Case): Step[] {
  reader = () => e8.completingRead("Pick: ", c.collection ?? [], { requireMatch: c.require_match ?? false, history: "cr-history", default: c.default });
  const bindings = { ...(c.vars ?? {}), "cr-answer": null, "cr-history": c.history ?? [] };
  return e8.letBind(bindings, () => {
    const states: Step[] = typeAtPrompt(["<f5>", ...c.keys], () => {
      const [before, after] = minibufferStrings();
      return { input: e8.minibufferContents(), before, after };
    });
    if (e8.minibufferDepth() === 0) {
      const answer = e8.variable("cr-answer");
      states.push({ exited: true, answer: typeof answer === "string" ? answer : null });
    }
    return states;
  });
}

e8.callWithPrefix(1, "vertico-mode" as e8.CommandName);

const golden = readJson<{ cases: { name: string; states: Step[] }[] }>("golden.json");
for (const c of readJson<Case[]>("cases.json")) {
  ertDeftest(`${c.name}-shows-what-emacs-shows`, () => {
    const recorded = golden.cases.find((r) => r.name === c.name);
    should(recorded !== undefined, `${c.name} is recorded`);
    shouldEqual(replay(c), recorded!.states, c.name);
  });
}

ertDeftest("vertico-the-minibuffer-may-grow-to-show-vertico-count-lines", () => {
  // The minibuffer may grow past a quarter of the frame for vertico-count
  // lines, as vertico sets max-mini-window-height there, so the selected
  // candidate stays in sight as the arrow keys move down the list.
  const quarter = Math.max(1, Math.floor(e8.frameSize().lines / 4));
  const candidates = Array.from({ length: 20 }, (_, i) => `c${i + 1}`);
  const read = e8.defineCommand({
    name: "vertico-tests-read",
    run: () => {
      e8.completingRead("Pick: ", candidates);
    },
  });
  e8.bindKey("<f6>", read);
  e8.letBind({ "vertico-count": 12 }, () => {
    const keys = ["<f6>", ...Array<string>(8).fill("<down>"), "C-g"];
    const seen: { lines: number; before: string; after: string; max: number }[] = [];
    const snapshot = () => {
      const [before, after] = minibufferStrings();
      return { lines: e8.frameSize().maxMiniWindowLines, before, after, max: Number(e8.variable("max-mini-window-height")) };
    };
    shouldError(() => typeAtPrompt(keys, snapshot, seen), { type: "quit" });
    const last = seen[seen.length - 1];
    // Twelve candidates, the ninth selected, and the whole frame to show them in.
    shouldEqual(last.after.split("\n").slice(1, -1), candidates.slice(0, 12));
    shouldEqual(last.before, "9/20   ");
    shouldEqual(last.max, 1);
    should(last.lines >= 13, `the minibuffer may take ${last.lines} lines`);
  });
  // The window's own buffer keeps the quarter once the prompt is gone.
  shouldEqual(e8.frameSize().maxMiniWindowLines, quarter);
});
