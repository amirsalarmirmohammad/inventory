
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const DB_FILE = "database.json";

// خواندن دیتابیس
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, "[]");
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}

// ذخیره دیتابیس
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// گرفتن همه کالاها
app.get("/items", (req, res) => {
  res.json(loadDB());
});

// اضافه کردن کالا
app.post("/items", (req, res) => {
  const items = loadDB();
  const newItem = { id: uuidv4(), ...req.body };
  items.push(newItem);
  saveDB(items);
  res.json(newItem);
});

// حذف کالا
app.delete("/items/:id", (req, res) => {
  let items = loadDB();
  items = items.filter(i => i.id !== req.params.id);
  saveDB(items);
  res.json({ success: true });
});

// ویرایش کالا
app.put("/items/:id", (req, res) => {
  let items = loadDB();
  const index = items.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Not found" });

  items[index] = { ...items[index], ...req.body };
  saveDB(items);
  res.json(items[index]);
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
