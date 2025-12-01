import winston from "winston";
import path from "path";

const logDir = path.join(process.cwd(), "logs");

const transports: any[] = [new winston.transports.Console()];

try {
  transports.push(new winston.transports.File({ filename: path.join(logDir, "error.log"), level: "error" }));
  transports.push(new winston.transports.File({ filename: path.join(logDir, "combined.log") }));
} catch (err) {
  // ignore file transport errors in environments without filesystem access
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "gateway-backend" },
  transports,
});

export default logger;
