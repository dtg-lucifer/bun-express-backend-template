import type { NextFunction, Request, Response } from "express";
import type { Pool } from "pg";
import type { Server as SocketIOServer } from "socket.io";
import type { DomainEventBus } from "~/shared/events";
import { log } from "./logger.middleware";

export interface AppDependencies {
	db: Pool;
	eventBus: DomainEventBus;
	io?: SocketIOServer;
}

declare global {
	namespace Express {
		interface Locals {
			db: Pool;
			eventBus: DomainEventBus;
			io?: SocketIOServer;
			user?: {
				id: string;
				email: string;
			};
		}
	}
}

export const createDependencyInjectionMiddleware = (dependencies: AppDependencies) => {
	log.info("Dependency injection middleware initialized");

	return (_req: Request, res: Response, next: NextFunction) => {
		res.locals.db = dependencies.db;
		res.locals.eventBus = dependencies.eventBus;

		if (dependencies.io) {
			res.locals.io = dependencies.io;
		}

		next();
	};
};
