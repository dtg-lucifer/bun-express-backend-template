/**
 * Generates openapi.yaml from all *.openapi.ts registry definitions.
 * Run with: bun run docs:generate
 */
import fs from "node:fs";
import path from "node:path";
import * as YAML from "yaml";

// Import the registry setup first, then all module definitions
import { generateOpenApiDocument } from "~/config/openapi";
import { log } from "~/core/middlewares";
import "~/modules/auth/auth.openapi";
import "~/modules/health/health.openapi";
import "~/modules/users/users.openapi";

const doc = generateOpenApiDocument();
const yaml = YAML.stringify(doc);
const outPath = path.join(process.cwd(), "openapi.yaml");

fs.writeFileSync(outPath, yaml, "utf-8");
log.info(`✓ openapi.yaml written to ${outPath}`);
