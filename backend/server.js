require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ============================================
// HELPERS
// ============================================

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const validId = (id) =>
  Number.isInteger(Number(id)) && Number(id) > 0;

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
    const value = body[field];

    if (value === "" || value === null || value === undefined) {
      values[field] = null;
      continue;
    }

    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
      return {
        valid: false,
        error: `${field} must be a non-negative number.`,
      };
    }

    values[field] = number;
  }

  return { valid: true, values };
}

const orderStatuses = [
  "Pending",
  "In Progress",
  "Completed",
  "Cancelled",
];

function validateOrder(body) {
  const customerId = Number(body.customer_id);
  const quantity = Number(body.quantity ?? 1);
  const totalPrice = Number(body.total_price ?? 0);
  const garmentType = String(body.garment_type || "").trim();
  const status = body.status || "Pending";

  if (!validId(body.customer_id)) {
    return {
      valid: false,
      error: "Please select a valid customer.",
    };
  }

  if (!garmentType) {
    return {
      valid: false,
      error: "Garment type is required.",
    };
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return {
      valid: false,
      error: "Quantity must be a positive whole number.",
    };
  }

  if (!Number.isFinite(totalPrice) || totalPrice < 0) {
    return {
      valid: false,
      error: "Total price must be a non-negative number.",
    };
  }

  if (!orderStatuses.includes(status)) {
    return {
      valid: false,
      error: "Invalid order status.",
    };
  }

  return {
    valid: true,
    values: {
      orderCode: String(body.order_code || "").trim() || null,
      customerId,
      garmentType,
      description: body.description || null,
      quantity,
      orderDate: body.order_date || null,
      dueDate: body.due_date || null,
      status,
      totalPrice,
      notes: body.notes || null,
    },
  };
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
// CUSTOMERS CRUD
// ============================================

// GET ALL CUSTOMERS
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

// GET CUSTOMER BY ID
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
      [Number(req.params.id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Customer not found.",
      });
    }

    res.json(result.rows[0]);
  })
);

// CREATE CUSTOMER
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

// UPDATE CUSTOMER
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
        Number(req.params.id),
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

// DELETE CUSTOMER
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
        [Number(req.params.id)]
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
// MEASUREMENTS CRUD
// ============================================

// GET ALL MEASUREMENTS
// Optional filter: /api/measurements?customer_id=1
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

// GET MEASUREMENT BY ID
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
      [Number(req.params.id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Measurement not found.",
      });
    }

    res.json(result.rows[0]);
  })
);

// CREATE MEASUREMENT
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

// UPDATE MEASUREMENT
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
        Number(req.params.id),
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

// DELETE MEASUREMENT
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
      [Number(req.params.id)]
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
// DAY 3: TAILORING ORDERS CRUD
// ============================================

// GET ALL ORDERS
app.get(
  "/api/orders",
  asyncHandler(async (_req, res) => {
    const result = await db.query(`
      SELECT o.*, c.name AS customer_name
      FROM public.orders AS o
      JOIN public.customers AS c
        ON c.id = o.customer_id
      ORDER BY o.id DESC
    `);

    res.json(result.rows);
  })
);

// GET ORDER BY ID
app.get(
  "/api/orders/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        error: "Invalid order ID.",
      });
    }

    const result = await db.query(
      `SELECT o.*, c.name AS customer_name
       FROM public.orders AS o
       JOIN public.customers AS c
         ON c.id = o.customer_id
       WHERE o.id = $1`,
      [Number(req.params.id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Order not found.",
      });
    }

    res.json(result.rows[0]);
  })
);

// CREATE ORDER
app.post(
  "/api/orders",
  asyncHandler(async (req, res) => {
    const parsed = validateOrder(req.body);

    if (!parsed.valid) {
      return res.status(400).json({
        error: parsed.error,
      });
    }

    const v = parsed.values;

    const customer = await db.query(
      "SELECT id FROM public.customers WHERE id = $1",
      [v.customerId]
    );

    if (customer.rowCount === 0) {
      return res.status(400).json({
        error: "The selected customer does not exist.",
      });
    }

    const result = await db.query(
      `INSERT INTO public.orders
        (order_code, customer_id, garment_type, description,
         quantity, order_date, due_date, status, total_price, notes)
       VALUES
        ($1, $2, $3, $4, $5,
         COALESCE($6::date, CURRENT_DATE), $7, $8, $9, $10)
       RETURNING *`,
      [
        v.orderCode,
        v.customerId,
        v.garmentType,
        v.description,
        v.quantity,
        v.orderDate,
        v.dueDate,
        v.status,
        v.totalPrice,
        v.notes,
      ]
    );

    res.status(201).json(result.rows[0]);
  })
);

// UPDATE ORDER
app.put(
  "/api/orders/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        error: "Invalid order ID.",
      });
    }

    const parsed = validateOrder(req.body);

    if (!parsed.valid) {
      return res.status(400).json({
        error: parsed.error,
      });
    }

    const v = parsed.values;

    const customer = await db.query(
      "SELECT id FROM public.customers WHERE id = $1",
      [v.customerId]
    );

    if (customer.rowCount === 0) {
      return res.status(400).json({
        error: "The selected customer does not exist.",
      });
    }

    const result = await db.query(
      `UPDATE public.orders
       SET order_code = $1,
           customer_id = $2,
           garment_type = $3,
           description = $4,
           quantity = $5,
           order_date = COALESCE($6::date, CURRENT_DATE),
           due_date = $7,
           status = $8,
           total_price = $9,
           notes = $10
       WHERE id = $11
       RETURNING *`,
      [
        v.orderCode,
        v.customerId,
        v.garmentType,
        v.description,
        v.quantity,
        v.orderDate,
        v.dueDate,
        v.status,
        v.totalPrice,
        v.notes,
        Number(req.params.id),
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Order not found.",
      });
    }

    res.json(result.rows[0]);
  })
);

// DELETE ORDER
app.delete(
  "/api/orders/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        error: "Invalid order ID.",
      });
    }

    const result = await db.query(
      `DELETE FROM public.orders
       WHERE id = $1
       RETURNING id`,
      [Number(req.params.id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Order not found.",
      });
    }

    res.json({
      message: "Order deleted successfully.",
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

  if (res.headersSent) return;

  if (error.code === "23503") {
    return res.status(400).json({
      error:
        "The selected related record does not exist or is still in use.",
    });
  }

  if (error.code === "23505") {
    return res.status(409).json({
      error: "A record with that unique value already exists.",
    });
  }

  if (["22P02", "22007", "23514"].includes(error.code)) {
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