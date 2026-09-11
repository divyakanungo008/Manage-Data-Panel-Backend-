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

export const config = {
  port: readPort(),
  supabaseUrl: readRequiredEnv("SUPABASE_URL"),
  supabaseAnonKey: readRequiredEnv("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
