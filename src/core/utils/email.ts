import { log } from "../middlewares/logger";

export interface EmailPayload {
    to: string;
    subject: string;
    html: string;
}

export class EmailService {
    async send(_payload: EmailPayload): Promise<void> {
        log.warn("EmailService.send is a template placeholder. Integrate your provider here.");
    }
}
