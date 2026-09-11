import { Router } from "express";
import { supabase } from "../supabaseClient.js";
import { parseRecord, toDbRecord } from "../validation.js";

const router = Router();
const knownTypes = ["Student", "Teacher", "Mentor", "Job Seeker", "Institute"];

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function parsePagination(query) {
  const page = Math.max(Number.parseInt(query.page ?? "1", 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit ?? "10", 10) || 10, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

function applyFilters(query, params) {
  let filtered = query;
  const search = typeof params.search === "string" ? params.search.trim().replace(/[,%]/g, " ") : "";
  if (search) {
    filtered = filtered.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%,link_url.ilike.%${search}%,download_url.ilike.%${search}%`);
  }
  if (params.type && params.type !== "All Data") {
    filtered = params.type === "Others"
      ? filtered.not("type", "in", '("Student","Teacher","Mentor","Job Seeker","Institute")')
      : filtered.eq("type", params.type);
  }
  if (params.linkStatus && params.linkStatus !== "All Status") {
    filtered = filtered.eq("link_status", params.linkStatus);
  }
  if (params.downloadStatus && params.downloadStatus !== "All Status") {
    filtered = filtered.eq("download_status", params.downloadStatus);
  }
  if (params.startDate) filtered = filtered.gte("date_added", params.startDate);
  if (params.endDate) filtered = filtered.lte("date_added", params.endDate);
  return filtered;
}

async function countByType(type) {
  const { count, error } = await supabase.from("records").select("id", { count: "exact", head: true }).eq("type", type);
  if (error) throw error;
  return count ?? 0;
}

router.get("/summary", asyncRoute(async (_req, res) => {
  const allDataPromise = supabase.from("records").select("id", { count: "exact", head: true });
  const [allDataResult, students, teachers, institutes] = await Promise.all([
    allDataPromise,
    countByType("Student"),
    countByType("Teacher"),
    countByType("Institute"),
  ]);
  if (allDataResult.error) throw allDataResult.error;
  res.json({ allData: allDataResult.count ?? 0, students, teachers, institutes });
}));

router.get("/records", asyncRoute(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const baseQuery = supabase.from("records").select("*", { count: "exact" });
  const query = applyFilters(baseQuery, req.query).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  res.json({
    data: data ?? [],
    pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
  });
}));

router.get("/records/:id", asyncRoute(async (req, res) => {
  const { data, error } = await supabase.from("records").select("*").eq("id", req.params.id).maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, message: "Record not found" });
  return res.json({ success: true, data });
}));

router.post("/records", asyncRoute(async (req, res) => {
  const parsed = parseRecord(req.body);
  if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.message });
  const { data, error } = await supabase.from("records").insert(toDbRecord(parsed.data)).select("*").maybeSingle();
  if (error) throw error;
  return res.status(201).json({ success: true, data, message: "Record created successfully" });
}));

router.post("/records/delete-multiple", asyncRoute(async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map((id) => (typeof id === "string" ? id.trim() : ""))
    : [];
  if (ids.length === 0 || ids.some((id) => id.length === 0)) {
    return res.status(400).json({ success: false, message: "ids must be a non-empty array" });
  }
  const { error, count } = await supabase.from("records").delete({ count: "exact" }).in("id", ids);
  if (error) throw error;
  const deleted = count ?? 0;
  return res.json({ success: true, deleted, message: `${deleted} record(s) deleted successfully` });
}));

router.put("/records/:id", asyncRoute(updateRecord));
router.patch("/records/:id", asyncRoute(updateRecord));

async function updateRecord(req, res) {
  const parsed = parseRecord(req.body);
  if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.message });
  const { data, error } = await supabase.from("records").update(toDbRecord(parsed.data)).eq("id", req.params.id).select("*").maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ success: false, message: "Record not found" });
  return res.json({ success: true, data, message: "Record updated successfully" });
}

router.delete("/records/:id", asyncRoute(async (req, res) => {
  const { error, count } = await supabase.from("records").delete({ count: "exact" }).eq("id", req.params.id);
  if (error) throw error;
  if (count === 0) return res.status(404).json({ success: false, message: "Record not found" });
  return res.json({ success: true, message: "Record deleted successfully" });
}));

router.post(["/import", "/records/import"], asyncRoute(async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : req.body.records;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: "No records provided" });
  }
  const validRecords = [];
  const errors = [];
  rows.forEach((row, index) => {
    const parsed = parseRecord(row);
    if (parsed.ok) validRecords.push(toDbRecord(parsed.data));
    else errors.push({ row: index + 1, errors: [parsed.message] });
  });
  let imported = 0;
  if (validRecords.length > 0) {
    const { data, error } = await supabase.from("records").insert(validRecords).select("id");
    if (error) throw error;
    imported = data?.length ?? 0;
  }
  return res.status(201).json({
    success: true,
    imported,
    errors,
    message: `${imported} record(s) imported successfully${errors.length > 0 ? `, ${errors.length} row(s) had errors` : ""}`,
  });
}));

export { knownTypes, router as recordsRouter };
