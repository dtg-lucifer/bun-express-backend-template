import type { Server as HTTPServer } from "node:http";
import type { DomainEventBus } from "@core/events";
import { log } from "@core/middlewares";
import { Server as SocketIOServer } from "socket.io";

interface SetupSocketServerInput {
    eventBus: DomainEventBus;
    origins: string[];
    path: string;
    server: HTTPServer;
}

export const setupSocketServer = ({
    eventBus,
    origins,
    path,
    server,
}: SetupSocketServerInput): SocketIOServer => {
    const io = new SocketIOServer(server, {
        cors: {
            origin: origins,
            credentials: true,
            methods: ["GET", "POST"],
        },
        path,
    });

    io.on("connection", (socket) => {
        log.info(`[SOCKET] Client connected: ${socket.id}`);
        socket.emit("system:hello", {
            message: "Connected to realtime server",
            socketId: socket.id,
        });

        socket.on("disconnect", (reason) => {
            log.info(`[SOCKET] Client disconnected: ${socket.id} (${reason})`);
        });
    });

    eventBus.on("auth.user.registered", (payload) => {
        io.emit("auth:user-registered", payload);
    });

    eventBus.on("queue.job.enqueued", (payload) => {
        io.emit("queue:job-enqueued", payload);
    });

    return io;
};
