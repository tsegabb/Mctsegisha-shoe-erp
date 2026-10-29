import { UserSession } from './auth.types.ts';

declare global {
  namespace Express {
    interface Request {
      user?: UserSession;
    }
  }
}
export {};
