import type { AuthUser } from './auth.types.ts';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: AuthUser;
      /** Output of validate(): Zod-parsed, coerced and stripped body/query/params. */
      valid?: { body: any; query: any; params: any };
    }
  }
}
export {};
