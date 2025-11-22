// backend/routes/products.js (ESM)
// Fixed: separate multer instances for images and CSVs, better error responses
import express from "express";
import db from "../db.js";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- ensure uploads dir ---
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ---------------------------
// Multer for images (image-only)
// ---------------------------
const storageImages = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext).slice(0, 40);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});
const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only image files allowed"), false);
  }
  cb(null, true);
};
const uploadImage = multer({
  storage: storageImages,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ---------------------------
// Multer for CSVs (csv/text)
// ---------------------------
const storageCsv = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".csv";
    const base = `import-${Date.now()}`;
    cb(null, `${base}${ext}`);
  },
});
const csvFileFilter = (req, file, cb) => {
  // allow common csv/traditional text types
  const allowed = [
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain",
  ];
  if (!allowed.includes(file.mimetype)) {
    // still allow if it has .csv extension but weird mime
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".csv") return cb(null, true);
    return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only CSV files allowed"), false);
  }
  cb(null, true);
};
const uploadCsv = multer({
  storage: storageCsv,
  fileFilter: csvFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for CSVs
});

// --- DB helpers ---
const dbGet = (sql, params = []) =>
  new Promise((res, rej) => db.get(sql, params, (e, r) => (e ? rej(e) : res(r))));
const dbAll = (sql, params = []) =>
  new Promise((res, rej) => db.all(sql, params, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, params = []) =>
  new Promise((res, rej) => db.run(sql, params, function (e) { e ? rej(e) : res(this); }));

// helper sample local path (for your environment)
const SAMPLE_LOCAL_PATH = "/mnt/data/b91e5689-bcb1-4eaf-b9c2-71066605a54b.png";
router.get("/sample-file", (req,res)=> res.json({ localPath: SAMPLE_LOCAL_PATH }));

// -----------------------------
// Upload image endpoint
// -----------------------------
router.post("/upload", (req, res, next) => {
  // use uploadImage.single but wrap to capture multer errors in JSON
  uploadImage.single("image")(req, res, (err) => {
    if (err) {
      // multer error -> return JSON
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message || "Upload error", code: err.code });
      }
      return res.status(500).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded (image)" });
    const protocol = req.protocol;
    const host = req.get("host");
    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    return res.json({ imageUrl });
  });
});

// -----------------------------
// CSV import endpoint
// -----------------------------
router.post("/import", (req, res, next) => {
  uploadCsv.single("csvFile")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message || "CSV upload error", code: err.code });
      }
      return res.status(500).json({ error: err.message || "CSV upload failed" });
    }

    if (!req.file) return res.status(400).json({ error: "CSV file (csvFile) is required" });

    const filePath = req.file.path;
    const rows = [];

    try {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on("data", (data) => rows.push(data))
          .on("end", resolve)
          .on("error", reject);
      });
    } catch (parseErr) {
      try { fs.unlinkSync(filePath); } catch(e) {}
      console.error("CSV parse error:", parseErr);
      return res.status(400).json({ error: "Failed to parse CSV", details: parseErr.message });
    }

    // process rows
    let addedCount = 0, skippedCount = 0;
    const duplicates = [], added = [], skipped = [];

    for (const raw of rows) {
      const name = (raw.name || raw.Name || raw.NAME || "").trim();
      const unit = raw.unit || raw.Unit || raw.UNIT || "";
      const category = raw.category || raw.Category || raw.CATEGORY || "";
      const brand = raw.brand || raw.Brand || raw.BRAND || "";
      const stock = Number(raw.stock || raw.Stock || raw.STOCK || 0);
      const status = raw.status || raw.Status || raw.STATUS || null;
      const image = raw.image || raw.Image || raw.IMAGE || null;

      if (!name) {
        skippedCount++; skipped.push({ row: raw, reason: "missing name" }); continue;
      }

      try {
        const existing = await dbGet("SELECT id FROM products WHERE LOWER(name)=LOWER(?)", [name]);
        if (existing) {
          skippedCount++; duplicates.push({ name, existingId: existing.id });
          skipped.push({ row: raw, reason: "duplicate", existingId: existing.id });
          continue;
        }
        const r = await dbRun(
          "INSERT INTO products (name, unit, category, brand, stock, status, image) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [name, unit, category, brand, stock, status, image]
        );
        addedCount++; added.push({ id: r.lastID, name });
      } catch (rowErr) {
        console.error("Insert error:", rowErr, "row:", raw);
        skippedCount++; skipped.push({ row: raw, reason: "db error", error: rowErr.message || String(rowErr) });
      }
    }

    try { fs.unlinkSync(filePath); } catch(e) {}

    return res.json({ addedCount, skippedCount, added, skipped, duplicates });
  });
});

// -----------------------------
// CSV export, search, CRUD, history - unchanged
// (kept from previous file; unchanged other than error logging)
// -----------------------------

router.get("/export", async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM products", []);
    const headers = ["id","name","unit","category","brand","stock","status","image"];
    const csvRows = [headers.join(",")];
    for (const r of rows) {
      const vals = headers.map(h => {
        const v = r[h] === null || typeof r[h] === "undefined" ? "" : String(r[h]).replace(/"/g,'""');
        return `"${v}"`;
      });
      csvRows.push(vals.join(","));
    }
    res.setHeader("Content-Type","text/csv");
    res.setHeader("Content-Disposition",'attachment; filename="products.csv"');
    return res.send(csvRows.join("\n"));
  } catch (err) { console.error("Export error:", err); return res.status(500).json({ error: err.message }); }
});

router.get("/search", async (req,res)=> {
  const q = req.query.name || "";
  try {
    const rows = await dbAll("SELECT * FROM products WHERE name LIKE ? COLLATE NOCASE", [`%${q}%`]);
    return res.json(rows);
  } catch (err) { console.error("Search error:", err); return res.status(500).json({ error: err.message }); }
});

router.get("/", async (req,res)=> {
  const { category, search } = req.query;
  try {
    let sql = "SELECT * FROM products";
    const params = [];
    if (category || search) {
      const clauses = [];
      if (category) { clauses.push("category=?"); params.push(category); }
      if (search) { clauses.push("name LIKE ?"); params.push(`%${search}%`); }
      sql += " WHERE " + clauses.join(" AND ");
    }
    const rows = await dbAll(sql, params);
    return res.json(rows);
  } catch (err) { console.error("List products error:", err); return res.status(500).json({ error: err.message }); }
});

router.post("/", async (req,res)=> {
  const { name, unit, category, brand, stock, status, image } = req.body;
  if (!name || String(name).trim()==="") return res.status(400).json({ error: "Name is required" });
  if (typeof stock !== "undefined" && Number(stock) < 0) return res.status(400).json({ error: "Stock must be >= 0" });
  try {
    const r = await dbRun("INSERT INTO products (name, unit, category, brand, stock, status, image) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, unit, category, brand, Number(stock), status, image]);
    const created = await dbGet("SELECT * FROM products WHERE id=?", [r.lastID]);
    return res.status(201).json(created);
  } catch (err) {
    console.error("Create product error:", err);
    if (err.message && err.message.includes("UNIQUE")) return res.status(400).json({ error: "Name must be unique" });
    return res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req,res)=> {
  const id = req.params.id;
  const { name, unit, category, brand, stock, status, image, changedBy } = req.body;
  try {
    const prod = await dbGet("SELECT * FROM products WHERE id=?", [id]);
    if (!prod) return res.status(404).json({ error: "Product not found" });
    if (typeof stock !== "undefined" && Number(stock) < 0) return res.status(400).json({ error: "Stock must be >= 0" });
    if (name && name !== prod.name) {
      const exists = await dbGet("SELECT id FROM products WHERE LOWER(name)=LOWER(?) AND id!=?", [name, id]);
      if (exists) return res.status(400).json({ error: "Name already exists" });
    }
    if (typeof stock !== "undefined" && Number(stock) !== prod.stock) {
      await dbRun("INSERT INTO inventory_logs (product_id, old_stock, new_stock, changed_by, timestamp) VALUES (?, ?, ?, ?, ?)",
        [id, prod.stock, Number(stock), changedBy || "system", new Date().toISOString()]);
    }
    await dbRun("UPDATE products SET name=?, unit=?, category=?, brand=?, stock=?, status=?, image=? WHERE id=?",
      [name || prod.name, unit || prod.unit, category || prod.category, brand || prod.brand, typeof stock !== "undefined" ? Number(stock) : prod.stock, status || prod.status, image || prod.image, id]);
    const updated = await dbGet("SELECT * FROM products WHERE id=?", [id]);
    return res.json(updated);
  } catch (err) { console.error("Update product error:", err); return res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req,res)=> {
  const id = req.params.id;
  try {
    const r = await dbRun("DELETE FROM products WHERE id=?", [id]);
    if (r.changes === 0) return res.status(404).json({ error: "Product not found" });
    return res.json({ deleted: true });
  } catch (err) { console.error("Delete product error:", err); return res.status(500).json({ error: err.message }); }
});

router.get("/:id/history", async (req,res)=> {
  const id = req.params.id;
  try {
    const logs = await dbAll("SELECT * FROM inventory_logs WHERE product_id=? ORDER BY timestamp DESC", [id]);
    return res.json(logs);
  } catch (err) { console.error("History error:", err); return res.status(500).json({ error: err.message }); }
});

router.get("/:id", async (req,res)=> {
  const id = req.params.id;
  try {
    const prod = await dbGet("SELECT * FROM products WHERE id=?", [id]);
    if (!prod) return res.status(404).json({ error: "Product not found" });
    return res.json(prod);
  } catch (err) { console.error("Get product error:", err); return res.status(500).json({ error: err.message }); }
});

export default router;
