export interface ImageMatch {
  urls: Record<number, string>;
  matchedIds: number[];
  skipped: string[];
}

const IMAGE_NAME = /^(\d+)\.(jpe?g|png|webp|gif)$/i;

/** Maps files named "<id>.jpg|png|webp|gif" (any folder depth) to question ids. */
export function matchImages(files: File[]): ImageMatch {
  const urls: Record<number, string> = {};
  const skipped: string[] = [];

  for (const file of files) {
    const m = IMAGE_NAME.exec(file.name);
    if (!m) {
      if (file.type.startsWith('image/')) skipped.push(file.name);
      continue;
    }
    const id = Number(m[1]);
    if (urls[id]) {
      skipped.push(file.name);
      continue;
    }
    urls[id] = URL.createObjectURL(file);
  }

  return { urls, matchedIds: Object.keys(urls).map(Number).sort((a, b) => a - b), skipped };
}

export function revokeImages(urls: Record<number, string>) {
  Object.values(urls).forEach(u => URL.revokeObjectURL(u));
}
