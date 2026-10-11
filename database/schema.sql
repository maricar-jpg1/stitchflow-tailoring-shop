CREATE TABLE IF NOT EXISTS customers (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    garment_type VARCHAR(100) NOT NULL DEFAULT 'General',
    chest_cm NUMERIC(7,2),
    waist_cm NUMERIC(7,2),
    hips_cm NUMERIC(7,2),
    shoulder_cm NUMERIC(7,2),
    sleeve_cm NUMERIC(7,2),
    length_cm NUMERIC(7,2),
    neck_cm NUMERIC(7,2),
    notes TEXT,
    measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_code VARCHAR(30) NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    garment_type VARCHAR(120) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending'
      CHECK (status IN ('Pending','In Progress','For Fitting','Ready for Pickup','Completed','Cancelled')),
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_price >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(40) NOT NULL DEFAULT 'Cash',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_no VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS materials (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL DEFAULT 'Other',
    unit VARCHAR(30) NOT NULL DEFAULT 'pieces',
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reorder_level NUMERIC(12,2) NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_movements (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    movement_type VARCHAR(3) NOT NULL CHECK (movement_type IN ('IN','OUT')),
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    notes VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_measurements_customer ON measurements(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_due_date ON orders(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_material_movements_material ON material_movements(material_id);
