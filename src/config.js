import dotenv from "dotenv";

dotenv.config();

function readRequiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function readPort() {
  const rawPort = process.env.PORT ?? "4000";
  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port");
  }
  return port;
}

function readCorsOrigins() {
  return (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isManageDataVercelOrigin(origin) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      (url.hostname === "manage-data-panel.vercel.app" ||
        (url.hostname.startsWith("manage-data-panel-") && url.hostname.endsWith(".vercel.app")))
    );
  } catch {
    return false;
  }
}

export function isCorsOriginAllowed(origin) {
  if (!origin) return true;
  if (config.corsOrigins.includes("*")) return true;
  return config.corsOrigins.includes(origin) || isManageDataVercelOrigin(origin);
}

export const config = {
  port: readPort(),
  supabaseUrl: readRequiredEnv("SUPABASE_URL"),
  supabaseAnonKey: readRequiredEnv("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  corsOrigins: readCorsOrigins(),
};
