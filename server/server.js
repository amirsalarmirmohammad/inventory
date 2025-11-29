import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ریشه پروژه (جایی که package.json و dist قرار می‌گیرند)
const ROOT_DIR = path.resolve(__dirname);

// فایل دیتابیس در کنار server.js
const DB_FILE = path.join(__dirname, "database.json");

// فولدر خروجی React بعد از build
const DIST_DIR = path.join(ROOT_DIR, "dist");

// اگر env خاصی تعریف شده بود، همونو بگیر، وگرنه dist
const CLIENT_DIR = process.env.CLIENT_DIR
  ? path.resolve(process.env.CLIENT_DIR)
  : fs.existsSync(DIST_DIR)
  ? DIST_DIR
  : ROOT_DIR;

app.use(cors());
app.use(bodyParser.json());

// ---------- توابع دیتابیس ساده ----------

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, "[]");
  }
  const raw = fs.readFileSync(DB_FILE, "utf-8") || "[]";
  return JSON.parse(raw);
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ---------- API: CRUD ----------

// گرفتن همه کالاها
app.get("/api/items", (req, res) => {
  res.json(loadDB());
});

// اضافه کردن کالا
app.post("/api/items", (req, res) => {
  const items = loadDB();
  const body = req.body || {};

  const newItem = {
    id: uuidv4(),
    name: body.name || "",
    code: body.code || "",
    quantity: body.quantity || "0",
    price: body.price || "0",
    location: body.location || "",
    category: body.category || "",
    description: body.description || "",
  };

  items.push(newItem);
  saveDB(items);
  res.json(newItem);
});

// ویرایش کالا
app.put("/api/items/:id", (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  const items = loadDB();

  const index = items.findIndex((i) => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Not found" });
  }

  items[index] = {
    ...items[index],
    ...body,
  };

  saveDB(items);
  res.json(items[index]);
});

// حذف کالا
app.delete("/api/items/:id", (req, res) => {
  const id = req.params.id;
  let items = loadDB();
  const before = items.length;
  items = items.filter((i) => i.id !== id);
  saveDB(items);
  res.json({ success: items.length < before });
});

// ---------- سرو کردن React build ----------

if (fs.existsSync(CLIENT_DIR)) {
  app.use(express.static(CLIENT_DIR));

  // هر مسیری غیر از /api/* → بده به React (SPA)
  app.get("*", (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
