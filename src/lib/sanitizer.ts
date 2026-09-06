/**
 * Strips all undefined fields and ensures clean JSON-serializable payloads
 * before sending to Cloud Firestore.
 */
export function sanitizePayload<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (Array.isArray(val)) {
        clean[key] = val.map((item) =>
          typeof item === 'object' && item !== null ? sanitizePayload(item) : item
        );
      } else if (typeof val === 'object' && val !== null) {
        clean[key] = sanitizePayload(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean as T;
}

/**
 * Validates text length against constraints in firebase-blueprint.json
 */
export function validateEntryBoundaries(content: string, title?: string): { valid: boolean; error?: string } {
  if (!content || !content.trim()) {
    return { valid: false, error: 'Reflection content cannot be empty.' };
  }
  if (content.length > 10000) {
    return { valid: false, error: 'Reflection content exceeds the maximum limit of 10,000 characters.' };
  }
  if (title && title.length > 200) {
    return { valid: false, error: 'Title exceeds the maximum limit of 200 characters.' };
  }
  return { valid: true };
}

/**
 * Formats any error (including JSON strings or nested error objects) into a safe, user-facing string.
 */
export function formatErrorMessage(err: unknown, fallback = 'An error occurred'): string {
  if (!err) return fallback;
  if (typeof err === 'string') {
    try {
      const parsed = JSON.parse(err);
      if (typeof parsed.error === 'string') return parsed.error;
      if (parsed.error && typeof parsed.error.message === 'string') return parsed.error.message;
      if (typeof parsed.message === 'string') return parsed.message;
    } catch {
      return err;
    }
    return err;
  }
  if (err instanceof Error) {
    try {
      const parsed = JSON.parse(err.message);
      if (typeof parsed.error === 'string') return parsed.error;
      if (parsed.error && typeof parsed.error.message === 'string') return parsed.error.message;
      if (typeof parsed.message === 'string') return parsed.message;
    } catch {
      return err.message;
    }
    return err.message;
  }
  if (typeof err === 'object') {
    const obj = err as any;
    if (typeof obj.error === 'string') return obj.error;
    if (obj.error && typeof obj.error.message === 'string') return obj.error.message;
    if (typeof obj.message === 'string') return obj.message;
  }
  return String(err);
}
