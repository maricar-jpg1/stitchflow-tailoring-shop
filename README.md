# StitchFlow Tailoring Shop Management System

Full-stack starter project:
- React + Vite frontend
- Node.js + Express REST API
- PostgreSQL database

## Features
1. Customer CRUD
2. Customer measurement records
3. Tailoring order CRUD and status tracking
4. Payment recording and remaining-balance calculations
5. Fabric/material inventory and stock movements
6. Dashboard totals and low-stock alerts
7. Reports for orders, payments, deadlines, and inventory

## Requirements
- Node.js LTS
- PostgreSQL (and pgAdmin if you prefer a graphical tool)

## 1. Create the database
Open pgAdmin Query Tool (connected to the default `postgres` database) and run:
```sql
CREATE DATABASE stitchflow_db;
```
Then open Query Tool for `stitchflow_db` and run all SQL from `database/schema.sql`.

Optional sample data:
```sql
INSERT INTO customers (full_name, phone, email, address)
VALUES
('Maria Santos', '09171234567', 'maria@example.com', 'Vinzons'),
('Juan Dela Cruz', '09181234567', 'juan@example.com', 'Daet')
ON CONFLICT DO NOTHING;

INSERT INTO materials (name, sku, category, unit, quantity, reorder_level, unit_cost)
VALUES
('Cotton Fabric', 'FAB-001', 'Fabric', 'meters', 40, 8, 120),
('Sewing Thread', 'THR-001', 'Thread', 'spools', 25, 5, 35),
('Buttons', 'BTN-001', 'Accessories', 'pieces', 100, 20, 2)
ON CONFLICT (sku) DO NOTHING;
```

## 2. Configure backend
In PowerShell:
```powershell
cd stitchflow-tailoring-shop\backend
npm.cmd install
```
Copy `.env.example` to `.env`, then change `DB_PASSWORD` to your PostgreSQL password.
```powershell
Copy-Item .env.example .env
npm.cmd run dev
```
API runs at `http://localhost:5000`.
Test: `http://localhost:5000/api/health`

## 3. Configure frontend
Open a second PowerShell terminal:
```powershell
cd stitchflow-tailoring-shop\frontend
npm.cmd install
npm.cmd run dev
```
Open the URL Vite prints, normally `http://localhost:5173`.

## API routes
- `GET/POST /api/customers`
- `GET/PUT/DELETE /api/customers/:id`
- `GET/POST /api/measurements`
- `GET/PUT/DELETE /api/measurements/:id`
- `GET/POST /api/orders`
- `GET/PUT/DELETE /api/orders/:id`
- `GET/POST /api/payments`
- `GET/DELETE /api/payments/:id`
- `GET/POST /api/materials`
- `GET/PUT/DELETE /api/materials/:id`
- `POST /api/materials/:id/movement`
- `GET /api/dashboard`
- `GET /api/reports`

## Notes
- This is a school-project starter. It does not include authentication or role permissions.
- For a real business, add authentication, automated backups, access controls, and deployment security before using real customer data.
- Do not commit your `.env` file to GitHub.
