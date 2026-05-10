import { z } from "zod";

export const get_user_by_email_schema = z.object({
    query: z.object({
        email: z.string().email(),
    }),
});

export type GetUserByEmailInput = z.infer<typeof get_user_by_email_schema>["query"];
