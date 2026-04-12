export function toPosixPath(inputPath: string): string {
  return inputPath.replaceAll('\\', '/');
}

function escapeRegExpSegment(text: string): string {
  return text.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function globSegmentToRegExp(part: string): string {
  let out = '';
  for (const ch of part) {
    if (ch === '*') {
      out += '[^/]*';
      continue;
    }
    if (ch === '?') {
      out += '[^/]';
      continue;
    }
    out += escapeRegExpSegment(ch);
  }
  return out;
}

export function globToRegExp(glob: string): RegExp {
  const normalized = toPosixPath(glob).trim();
  const parts = normalized
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  let regex = '^';
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part) continue;
    if (i > 0) {
      const prev = parts[i - 1];
      regex += prev === '**' ? '(?:/)?' : '/';
    }
    if (part === '**') {
      regex += '(?:.*)';
    } else {
      regex += globSegmentToRegExp(part);
    }
  }
  regex += '$';
  return new RegExp(regex);
}

export function matchesGlob(glob: string, relativePath: string): boolean {
  const re = globToRegExp(glob);
  return re.test(toPosixPath(relativePath));
}
