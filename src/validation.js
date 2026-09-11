import { z } from "zod";

const emptyToNull = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const optionalText = z.preprocess(emptyToNull, z.string().nullable().optional());
const optionalUrl = z.preprocess(
  emptyToNull,
  z.string().url("URL must be valid http/https").refine((value) => /^https?:\/\//i.test(value), "URL must use http or https").nullable().optional()
);
const phonePattern = /^[+]?\d[\d\s\-()]{6,19}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function toIsoDate(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpochOffset = 25569;
    return new Date(Math.round((value - excelEpochOffset) * 86400 * 1000)).toISOString().slice(0, 10);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (datePattern.test(trimmed)) return trimmed;

  const numericValue = Number(trimmed);
  if (Number.isFinite(numericValue)) return toIsoDate(numericValue);

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? trimmed : new Date(parsed).toISOString().slice(0, 10);
}

const dateSchema = z.string().regex(datePattern, "Date Added must be YYYY-MM-DD").refine((value) => {
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}, "Date Added must be a valid date");

export const recordSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.preprocess(emptyToNull, z.string().email("Invalid email format").nullable().optional()),
  phone_number: z.preprocess(emptyToNull, z.string().regex(phonePattern, "Invalid phone format").nullable().optional()),
  address: optionalText,
  organisation: optionalText,
  type: z.enum(["Student", "Teacher", "Mentor", "Job Seeker", "Institute", "Other"]),
  link_status: z.enum(["Pending", "Sent"]).default("Pending"),
  link_url: optionalUrl,
  download_status: z.enum(["Pending", "Downloaded", "Completed"]).default("Pending"),
  download_url: optionalUrl,
  date_added: z.preprocess(toIsoDate, dateSchema.nullable().optional()),
});

export function formatZodError(error) {
  return error.issues.map((issue) => `${issue.path.join(".") || "record"}: ${issue.message}`).join("; ");
}

export function parseRecord(input) {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: formatZodError(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}

export function toDbRecord(record) {
  return {
    name: record.name,
    email: record.email ?? null,
    phone_number: record.phone_number ?? null,
    address: record.address ?? null,
    organisation: record.organisation ?? null,
    type: record.type,
    link_status: record.link_status,
    link_url: record.link_url ?? null,
    download_status: record.download_status,
    download_url: record.download_url ?? null,
    date_added: record.date_added ?? new Date().toISOString().slice(0, 10),
  };
}
