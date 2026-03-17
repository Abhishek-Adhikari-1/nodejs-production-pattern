import { User, Session } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
    }
    interface Response {
      respond: <T = unknown>(data: T) => void;
    }
  }
}
