import { isWordBoundary } from "./utils.js";

export interface AhoAutomaton {
  next: Map<string, number>[];
  fail: number[];
  output: number[][];
}

export interface AhoSearchResult {
  counts: number[];
  positions?: number[][];
}

export interface AhoSearchOptions {
  collectPositions?: boolean;
  matchWholeWords?: boolean;
  allowApostrophe?: boolean;
  allowHyphen?: boolean;
}

export function buildAhoAutomaton(patterns: string[]): AhoAutomaton {
  const next: Map<string, number>[] = [new Map()];
  const fail: number[] = [0];
  const output: number[][] = [[]];

  for (let i = 0; i < patterns.length; i += 1) {
    const pattern = patterns[i];
    let state = 0;
    for (let j = 0; j < pattern.length; j += 1) {
      const char = pattern[j];
      const nextState = next[state].get(char);
      if (nextState === undefined) {
        const newState = next.length;
        next[state].set(char, newState);
        next.push(new Map());
        fail.push(0);
        output.push([]);
        state = newState;
      } else {
        state = nextState;
      }
    }
    output[state].push(i);
  }

  const queue: number[] = [];
  for (const [char, state] of next[0]) {
    fail[state] = 0;
    queue.push(state);
  }

  while (queue.length > 0) {
    const r = queue.shift() as number;
    for (const [char, s] of next[r]) {
      queue.push(s);

      let f = fail[r];
      while (f !== 0 && !next[f].has(char)) {
        f = fail[f];
      }

      if (next[f].has(char) && next[f].get(char) !== s) {
        fail[s] = next[f].get(char) as number;
      } else {
        fail[s] = 0;
      }

      if (output[fail[s]].length > 0) {
        output[s] = output[s].concat(output[fail[s]]);
      }
    }
  }

  return { next, fail, output };
}

export function searchAho(
  text: string,
  patterns: string[],
  options: AhoSearchOptions = {},
  automaton?: AhoAutomaton
): AhoSearchResult {
  const machine = automaton ?? buildAhoAutomaton(patterns);
  const counts = new Array(patterns.length).fill(0);
  const positions = options.collectPositions
    ? new Array(patterns.length).fill(null).map(() => [] as number[])
    : undefined;

  let state = 0;
  const matchWholeWords = options.matchWholeWords ?? false;
  const allowApostrophe = options.allowApostrophe ?? true;
  const allowHyphen = options.allowHyphen ?? true;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    while (state !== 0 && !machine.next[state].has(char)) {
      state = machine.fail[state];
    }

    const nextState = machine.next[state].get(char);
    if (nextState === undefined) {
      state = 0;
    } else {
      state = nextState;
    }

    const outputs = machine.output[state];
    if (outputs.length === 0) {
      continue;
    }

    for (let j = 0; j < outputs.length; j += 1) {
      const patternIndex = outputs[j];
      const patternLength = patterns[patternIndex].length;
      const start = i - patternLength + 1;
      const end = i + 1;

      if (
        matchWholeWords &&
        !isWordBoundary(text, start, end, { allowApostrophe, allowHyphen })
      ) {
        continue;
      }

      counts[patternIndex] += 1;
      if (positions) {
        positions[patternIndex].push(start);
      }
    }
  }

  return { counts, positions };
}
