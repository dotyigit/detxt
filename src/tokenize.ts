import { isBasicWordCharCode, isWordCharAt } from "./utils.js";
import type { TokenizeOptions } from "./types.js";

export function forEachToken(
  text: string,
  options: TokenizeOptions,
  onToken: (token: string) => void
): void {
  const allowApostrophe = options.allowApostrophe ?? true;
  const allowHyphen = options.allowHyphen ?? true;
  const minLength = options.minLength ?? 1;
  const includeNumbers = options.includeNumbers ?? true;
  const caseSensitive = options.caseSensitive ?? false;

  let start = -1;

  for (let i = 0; i <= text.length; i += 1) {
    const inBounds = i < text.length;
    const isWordChar = inBounds
      ? isWordCharAt(text, i, { allowApostrophe, allowHyphen })
      : false;

    if (isWordChar) {
      if (start === -1) {
        start = i;
      }
      continue;
    }

    if (start !== -1) {
      const token = text.slice(start, i);
      start = -1;

      if (token.length < minLength) {
        continue;
      }

      if (!includeNumbers) {
        let hasNumber = false;
        for (let j = 0; j < token.length; j += 1) {
          const code = token.charCodeAt(j);
          if (code >= 48 && code <= 57) {
            hasNumber = true;
            break;
          }
        }
        if (hasNumber) {
          continue;
        }
      }

      onToken(caseSensitive ? token : token.toLowerCase());
    }
  }
}

export function isLikelySingleWord(
  text: string,
  options: { allowApostrophe?: boolean; allowHyphen?: boolean }
): boolean {
  const allowApostrophe = options.allowApostrophe ?? true;
  const allowHyphen = options.allowHyphen ?? true;

  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (isBasicWordCharCode(code)) {
      continue;
    }

    const char = text[i];
    if (allowApostrophe && (char === "'" || char === "’")) {
      continue;
    }

    if (allowHyphen && char === "-") {
      continue;
    }

    return false;
  }

  return text.length > 0;
}
