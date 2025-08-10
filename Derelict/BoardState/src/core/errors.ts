export class BoardError extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const ERR_BAD_GLYPH = 'ERR_BAD_GLYPH';
export const ERR_BAD_COORD = 'ERR_BAD_COORD';
export const ERR_OVERLAP = 'ERR_OVERLAP';
export const ERR_PARSE = 'ERR_PARSE';
export const ERR_DUP_ID = 'ERR_DUP_ID';
export const ERR_UNKNOWN_SEGMENT_DEF = 'ERR_UNKNOWN_SEGMENT_DEF';
export const ERR_UNKNOWN_TOKEN_TYPE = 'ERR_UNKNOWN_TOKEN_TYPE';
