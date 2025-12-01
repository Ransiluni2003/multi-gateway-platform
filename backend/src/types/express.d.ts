import { IUser } from "../models/User";
import "express";

declare module "express-serve-static-core" {
  interface Request {
    traceId?: string;
  }
}


declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
