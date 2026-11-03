export interface UrlApi {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
}

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Holds one reference photo for the builder. The photo exists only as a local object address in this
 * browser: nothing here reads it into the page's data, sends it anywhere or stores it, and clearing it
 * (or leaving the page) releases it.
 */
export function createPhotoReference(api: UrlApi) {
  let url: string | null = null;
  return {
    get url() {
      return url;
    },
    set(file: Blob): string {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
      if (file.size > MAX_BYTES) throw new Error('Choose an image under 15 MB.');
      if (url) api.revokeObjectURL(url);
      url = api.createObjectURL(file);
      return url;
    },
    clear() {
      if (url) api.revokeObjectURL(url);
      url = null;
    },
  };
}
