import pino from "pino";

const level = process.env.LOG_LEVEL ?? "info";
const enabled = process.env.LOG_ENABLED ?? "true";

export const logger = pino({
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  enabled: enabled === "true",
});
