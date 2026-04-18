import type { NextFunction, Request, Response } from "express";
import type { Pool } from "pg";
import { log } from "./logger";

export interface AppDependencies {
    db: Pool;
}

declare global {
    namespace Express {
        interface Locals {
            db: Pool;
            user?: {
                id: string;
                email: string;
                role: string;
            };
        }
    }
}

export const createDependencyInjectionMiddleware = (db: Pool) => {
    log.info("Dependency injection middleware initialized");

    return (_req: Request, res: Response, next: NextFunction) => {
        res.locals.db = db;
        next();
    };
};
