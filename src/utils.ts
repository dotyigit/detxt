export function collapseWhitespace(input: string): string {
  let result = "";
  let inSpace = false;

  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    const isSpace = code <= 32 || code === 160; // 160 = non-breaking space

    if (isSpace) {
      if (!inSpace && result.length > 0) {
        result += " ";
        inSpace = true;
      }
      continue;
    }

    result += input[i];
    inSpace = false;
  }

  if (result.endsWith(" ")) {
    return result.slice(0, -1);
  }

  return result;
}

export function isBasicWordCharCode(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122)
  );
}

export function isWordCharAt(
  text: string,
  index: number,
  options: { allowApostrophe?: boolean; allowHyphen?: boolean }
): boolean {
  const code = text.charCodeAt(index);
  if (isBasicWordCharCode(code)) {
    return true;
  }

  const char = text[index];
  const prevCode = index > 0 ? text.charCodeAt(index - 1) : 0;
  const nextCode = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;

  if (options.allowApostrophe && (char === "'" || char === "’")) {
    return isBasicWordCharCode(prevCode) && isBasicWordCharCode(nextCode);
  }

  if (options.allowHyphen && char === "-") {
    return isBasicWordCharCode(prevCode) && isBasicWordCharCode(nextCode);
  }

  return false;
}

export function isWordBoundary(
  text: string,
  start: number,
  end: number,
  options: { allowApostrophe?: boolean; allowHyphen?: boolean }
): boolean {
  const before = start > 0 ? isWordCharAt(text, start - 1, options) : false;
  const after = end < text.length ? isWordCharAt(text, end, options) : false;
  return !before && !after;
}

export function normalizeCase(text: string, caseSensitive?: boolean): string {
  return caseSensitive ? text : text.toLowerCase();
}

export function isEmptyText(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (!(code <= 32 || code === 160)) {
      return false;
    }
  }
  return true;
}
