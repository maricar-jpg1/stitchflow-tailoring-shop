
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Handle async route errors
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Validate numeric IDs
const validId = (id) =>
  Number.isInteger(Number(id)) && Number(id) > 0;

// Validate measurement values
function parseMeasurement(value, fieldName) {
  if (value === "" || value === null || value === undefined) {
    return { valid: true, value: null };
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return {
      valid: false,
      error: `${fieldName} must be a non-negative number.`,
    };
  }

  return { valid: true, value: number };
}

const measurementFields = [
  "chest",
  "waist",
  "hips",
  "shoulder",
  "sleeve",
  "length",
];

function readMeasurements(body) {
  const values = {};

  for (const field of measurementFields) {
    const parsed = parseMeasurement(body[field], field);

    if (!parsed.valid) {
      return { valid: false, error: parsed.error };
    }

    values[field] = parsed.value;
  }

  return { valid: true, values };
}

// ============================================
// HEALTH CHECK
// ============================================

app.get(
  "/api/health",
  asyncHandler(async (_req, res) => {
    await db.query("SELECT 1");

    res.json({
      message: "StitchFlow API and PostgreSQL are connected.",
    });
  })
);

// ============================================
// CUSTOMERS
// Database columns:
// id, name, phone, email, address, created_at
// ============================================

// GET all customers
app.get(
  "/api/customers",
  asyncHandler(async (_req, res) => {
    const result = await db.query(`
      SELECT id, name, phone, email, address, created_at
      FROM public.customers
      ORDER BY id DESC
    `);

    res.json(result.rows);
  })
);

// GET one customer
app.get(
  "/api/customers/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        error: "Invalid customer ID.",
      });
    }

    const result = await db.query(
      `SELECT id, name, phone, email, address, created_at
       FROM public.customers
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Customer not found.",
      });
    }

    res.json(result.rows[0]);
  })
);

// CREATE customer
app.post(
  "/api/customers",
  asyncHandler(async (req, res) => {
    const { name, phone, email, address } = req.body;

    if (!String(name || "").trim()) {
      return res.status(400).json({
        error: "Customer name is required.",
      });
    }

    const result = await db.query(
      `INSERT INTO public.customers
         (name, phone, email, address)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, phone, email, address, created_at`,
      [
        String(name).trim(),
        phone || null,
        email || null,
        address || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  })
);

// UPDATE customer
app.put(
  "/api/customers/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        error: "Invalid customer ID.",
      });
    }

    const { name, phone, email, address } = req.body;

    if (!String(name || "").trim()) {
      return res.status(400).json({
        error: "Customer name is required.",
      });
    }

    const result = await db.query(
      `UPDATE public.customers
       SET name = $1,
           phone = $2,
           email = $3,
           address = $4
       WHERE id = $5
       RETURNING id, name, phone, email, address, created_at`,
      [
        String(name).trim(),
        phone || null,
        email || null,
        address || null,
        req.params.id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Customer not found.",
      });
    }

    res.json(result.rows[0]);
  })
);

// DELETE customer
app.delete(
  "/api/customers/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        error: "Invalid customer ID.",
      });
    }

    try {
      const result = await db.query(
        `DELETE FROM public.customers
         WHERE id = $1
         RETURNING id`,
        [req.params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Customer not found.",
        });
      }

      res.json({
        message: "Customer deleted successfully.",
      });
    } catch (error) {
      if (error.code === "23503") {
        return res.status(409).json({
          error:
            "This customer is linked to other records and cannot be deleted.",
        });
      }

      throw error;
    }
  })
);

// ============================================
// MEASUREMENTS
// Database columns:
// id, customer_id, chest, waist, hips, shoulder,
// sleeve, length, notes, created_at
// ============================================

// GET all measurements
app.get(
  "/api/measurements",
  asyncHandler(async (req, res) => {
    const params = [];
    let filter = "";

    if (req.query.customer_id) {
      if (!validId(req.query.customer_id)) {
        return res.status(400).json({
          error: "Invalid customer ID.",
        });
      }

      params.push(Number(req.query.customer_id));
      filter = "WHERE m.customer_id = $1";
    }

    const result = await db.query(
      `SELECT
         m.id,
         m.customer_id,
         c.name AS customer_name,
         m.chest,
         m.waist,
         m.hips,
         m.shoulder,
         m.sleeve,
         m.length,
         m.notes,
         m.created_at
       FROM public.measurements AS m
       LEFT JOIN public.customers AS c
         ON c.id = m.customer_id
       ${filter}
       ORDER BY m.id DESC`,
      params
    );

    res.json(result.rows);
  })
);

// GET one measurement
app.get(
  "/api/measurements/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        error: "Invalid measurement ID.",
      });
    }

    const result = await db.query(
      `SELECT
         m.id,
         m.customer_id,
         c.name AS customer_name,
         m.chest,
         m.waist,
         m.hips,
         m.shoulder,
         m.sleeve,
         m.length,
         m.notes,
         m.created_at
       FROM public.measurements AS m
       LEFT JOIN public.customers AS c
         ON c.id = m.customer_id
       WHERE m.id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Measurement not found.",
      });
    }

    res.json(result.rows[0]);
  })
);

// CREATE measurement
app.post(
  "/api/measurements",
  asyncHandler(async (req, res) => {
    const { customer_id, notes } = req.body;

    if (!validId(customer_id)) {
      return res.status(400).json({
        error: "Please select a valid customer.",
      });
    }

    const parsed = readMeasurements(req.body);

    if (!parsed.valid) {
      return res.status(400).json({
        error: parsed.error,
      });
    }

    const customer = await db.query(
      "SELECT id FROM public.customers WHERE id = $1",
      [Number(customer_id)]
    );

    if (customer.rowCount === 0) {
      return res.status(400).json({
        error: "The selected customer does not exist.",
      });
    }

    const v = parsed.values;

    const result = await db.query(
      `INSERT INTO public.measurements
         (customer_id, chest, waist, hips, shoulder, sleeve, length, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, customer_id, chest, waist, hips,
                 shoulder, sleeve, length, notes, created_at`,
      [
        Number(customer_id),
        v.chest,
        v.waist,
        v.hips,
        v.shoulder,
        v.sleeve,
        v.length,
        notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  })
);

// UPDATE measurement
app.put(
  "/api/measurements/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        error: "Invalid measurement ID.",
      });
    }

    const { customer_id, notes } = req.body;

    if (!validId(customer_id)) {
      return res.status(400).json({
        error: "Please select a valid customer.",
      });
    }

    const parsed = readMeasurements(req.body);

    if (!parsed.valid) {
      return res.status(400).json({
        error: parsed.error,
      });
    }

    const customer = await db.query(
      "SELECT id FROM public.customers WHERE id = $1",
      [Number(customer_id)]
    );

    if (customer.rowCount === 0) {
      return res.status(400).json({
        error: "The selected customer does not exist.",
      });
    }

    const v = parsed.values;

    const result = await db.query(
      `UPDATE public.measurements
       SET customer_id = $1,
           chest = $2,
           waist = $3,
           hips = $4,
           shoulder = $5,
           sleeve = $6,
           length = $7,
           notes = $8
       WHERE id = $9
       RETURNING id, customer_id, chest, waist, hips,
                 shoulder, sleeve, length, notes, created_at`,
      [
        Number(customer_id),
        v.chest,
        v.waist,
        v.hips,
        v.shoulder,
        v.sleeve,
        v.length,
        notes || null,
        req.params.id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Measurement not found.",
      });
    }

    res.json(result.rows[0]);
  })
);

// DELETE measurement
app.delete(
  "/api/measurements/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        error: "Invalid measurement ID.",
      });
    }

    const result = await db.query(
      `DELETE FROM public.measurements
       WHERE id = $1
       RETURNING id`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Measurement not found.",
      });
    }

    res.json({
      message: "Measurement deleted successfully.",
    });
  })
);

// ============================================
// UNKNOWN ROUTES
// ============================================

app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((error, _req, res, _next) => {
  console.error("API request failed:", error);

  if (res.headersSent) {
    return;
  }

  if (error.code === "23503") {
    return res.status(400).json({
      error: "The selected related record does not exist or is still in use.",
    });
  }

  if (
    error.code === "22P02" ||
    error.code === "22007" ||
    error.code === "23514"
  ) {
    return res.status(400).json({
      error: "One or more values are invalid.",
    });
  }

  res.status(500).json({
    error: "Server error. Check the backend terminal for details.",
    details:
      process.env.NODE_ENV === "production"
        ? undefined
        : error.message,
  });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    await db.query("SELECT 1");

    app.listen(PORT, () => {
      console.log(`StitchFlow API running at http://localhost:${PORT}`);
      console.log("PostgreSQL connection successful.");
    });
  } catch (error) {
    console.error("Could not connect to PostgreSQL:", error.message);
    console.error("Check backend/.env and confirm PostgreSQL is running.");
    process.exit(1);
  }
}

startServer();
