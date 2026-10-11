
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";


const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

export default function App() {
  const [page, setPage] = useState("customers");
  const [customers, setCustomers] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [measurementForm, setMeasurementForm] = useState({
    customer_id: "",
    chest: "",
    waist: "",
    hips: "",
    shoulder: "",
    sleeve: "",
    length: "",
    notes: "",
  });

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [customerResponse, measurementResponse] = await Promise.all([
        api.get("/customers"),
        api.get("/measurements"),
      ]);

      const customerData = customerResponse.data;
      const measurementData = measurementResponse.data;

      setCustomers(
        Array.isArray(customerData)
          ? customerData
          : customerData.customers || customerData.data || []
      );

      setMeasurements(
        Array.isArray(measurementData)
          ? measurementData
          : measurementData.measurements || measurementData.data || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Cannot load data. Check that the backend and PostgreSQL are running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetCustomerForm() {
    setCustomerForm({
      name: "",
      phone: "",
      email: "",
      address: "",
    });
    setEditingId(null);
  }

  function resetMeasurementForm() {
    setMeasurementForm({
      customer_id: "",
      chest: "",
      waist: "",
      hips: "",
      shoulder: "",
      sleeve: "",
      length: "",
      notes: "",
    });
    setEditingId(null);
  }

  async function saveCustomer(event) {
    event.preventDefault();
    setError("");

    try {
      if (editingId !== null) {
        await api.put(`/customers/${editingId}`, customerForm);
      } else {
        await api.post("/customers", customerForm);
      }

      resetCustomerForm();
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save customer."
      );
    }
  }

  function editCustomer(customer) {
    setCustomerForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    });
    setEditingId(customer.id);
    setPage("customers");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteCustomer(id) {
    if (!window.confirm("Delete this customer?")) return;

    try {
      await api.delete(`/customers/${id}`);
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete customer."
      );
    }
  }

  async function saveMeasurement(event) {
    event.preventDefault();
    setError("");

    const payload = Object.fromEntries(
      Object.entries(measurementForm).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ])
    );

    try {
      if (editingId !== null) {
        await api.put(`/measurements/${editingId}`, payload);
      } else {
        await api.post("/measurements", payload);
      }

      resetMeasurementForm();
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save measurement."
      );
    }
  }

  function editMeasurement(item) {
    setMeasurementForm({
      customer_id: String(item.customer_id || ""),
      chest: item.chest ?? "",
      waist: item.waist ?? "",
      hips: item.hips ?? "",
      shoulder: item.shoulder ?? "",
      sleeve: item.sleeve ?? "",
      length: item.length ?? "",
      notes: item.notes || "",
    });
    setEditingId(item.id);
    setPage("measurements");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteMeasurement(id) {
    if (!window.confirm("Delete this measurement?")) return;

    try {
      await api.delete(`/measurements/${id}`);
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete measurement."
      );
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <div>
            <h2>StitchFlow</h2>
            <p>Tailoring Management</p>
          </div>
        </div>

        <p className="menu-label">WORKSPACE</p>

        <button
          className={`nav-item ${page === "customers" ? "active" : ""}`}
          onClick={() => setPage("customers")}
        >
          <span>♙</span> Customers
        </button>

        <button
          className={`nav-item ${page === "measurements" ? "active" : ""}`}
          onClick={() => setPage("measurements")}
        >
          <span>♧</span> Measurements
        </button>

        <div className="sidebar-bottom">
          <p>StitchFlow System</p>
          <small>Tailoring made organized.</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">TAILORING SHOP</p>
            <h1>
              {page === "customers" ? "Customer Management" : "Measurements"}
            </h1>
          </div>
          <div className="profile">
            <div className="avatar">S</div>
            <div>
              <strong>Shop Admin</strong>
              <small>Administrator</small>
            </div>
          </div>
        </header>

        <section className="welcome">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h2>
              {page === "customers"
                ? "Manage your customers"
                : "Customer measurements"}
            </h2>
            <p>
              {page === "customers"
                ? "Keep customer information organized in one place."
                : "Record and manage measurements for custom-made clothing."}
            </p>
          </div>
          <div className="welcome-icon">✂</div>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-icon purple">♙</div>
            <p>Total Customers</p>
            <h2>{customers.length}</h2>
          </article>

          <article className="stat-card">
            <div className="stat-icon green">♧</div>
            <p>Total Measurements</p>
            <h2>{measurements.length}</h2>
          </article>

          <article className="stat-card">
            <div className="stat-icon orange">✂</div>
            <p>Shop Workspace</p>
            <h2>Active</h2>
          </article>
        </section>

        {error && (
          <div className="error-message">
            <span>{error}</span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        {page === "customers" && (
          <>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>{editingId !== null ? "Edit Customer" : "Add Customer"}</h2>
                  <p>Enter the customer's contact information.</p>
                </div>
              </div>

              <form className="form-grid" onSubmit={saveCustomer}>
                <label>
                  Full Name *
                  <input
                    required
                    value={customerForm.name}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Enter full name"
                  />
                </label>

                <label>
                  Phone Number
                  <input
                    value={customerForm.phone}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        phone: e.target.value,
                      })
                    }
                    placeholder="09XX XXX XXXX"
                  />
                </label>

                <label>
                  Email Address
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        email: e.target.value,
                      })
                    }
                    placeholder="customer@email.com"
                  />
                </label>

                <label>
                  Address
                  <input
                    value={customerForm.address}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        address: e.target.value,
                      })
                    }
                    placeholder="Enter address"
                  />
                </label>

                <div className="form-actions">
                  <button type="submit" className="primary-button">
                    {editingId !== null ? "Update Customer" : "+ Add Customer"}
                  </button>

                  {editingId !== null && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={resetCustomerForm}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Customer List</h2>
                  <p>{customers.length} customer record(s)</p>
                </div>
                <button className="secondary-button" onClick={loadData}>
                  Refresh
                </button>
              </div>

              {loading ? (
                <p className="empty-state">Loading customers...</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Address</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((customer) => (
                        <tr key={customer.id}>
                          <td><strong>{customer.name}</strong></td>
                          <td>{customer.phone || "—"}</td>
                          <td>{customer.email || "—"}</td>
                          <td>{customer.address || "—"}</td>
                          <td className="actions">
                            <button
                              className="edit-button"
                              onClick={() => editCustomer(customer)}
                            >
                              Edit
                            </button>
                            <button
                              className="delete-button"
                              onClick={() => deleteCustomer(customer.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {customers.length === 0 && (
                        <tr>
                          <td colSpan="5" className="empty-state">
                            No customers yet. Add your first customer above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {page === "measurements" && (
          <>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    {editingId !== null
                      ? "Edit Measurement"
                      : "Add Measurement"}
                  </h2>
                  <p>Record the customer's body measurements.</p>
                </div>
              </div>

              <form className="form-grid" onSubmit={saveMeasurement}>
                <label>
                  Customer *
                  <select
                    required
                    value={measurementForm.customer_id}
                    onChange={(e) =>
                      setMeasurementForm({
                        ...measurementForm,
                        customer_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>

                {["chest", "waist", "hips", "shoulder", "sleeve", "length"].map(
                  (field) => (
                    <label key={field}>
                      {field.charAt(0).toUpperCase() + field.slice(1)} (cm)
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={measurementForm[field]}
                        onChange={(e) =>
                          setMeasurementForm({
                            ...measurementForm,
                            [field]: e.target.value,
                          })
                        }
                        placeholder="Enter measurement"
                      />
                    </label>
                  )
                )}

                <label className="full-width">
                  Notes
                  <textarea
                    rows="3"
                    value={measurementForm.notes}
                    onChange={(e) =>
                      setMeasurementForm({
                        ...measurementForm,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Additional fitting notes"
                  />
                </label>

                <div className="form-actions">
                  <button type="submit" className="primary-button">
                    {editingId !== null
                      ? "Update Measurement"
                      : "+ Add Measurement"}
                  </button>
                  {editingId !== null && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={resetMeasurementForm}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Measurement Records</h2>
                  <p>{measurements.length} record(s)</p>
                </div>
                <button className="secondary-button" onClick={loadData}>
                  Refresh
                </button>
              </div>

              {loading ? (
                <p className="empty-state">Loading measurements...</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Chest</th>
                        <th>Waist</th>
                        <th>Hips</th>
                        <th>Shoulder</th>
                        <th>Sleeve</th>
                        <th>Length</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measurements.map((item) => (
                        <tr key={item.id}>
                          <td>
                            {item.customer_name ||
                              customers.find(
                                (c) => String(c.id) === String(item.customer_id)
                              )?.name ||
                              `Customer #${item.customer_id}`}
                          </td>
                          <td>{item.chest ?? "—"}</td>
                          <td>{item.waist ?? "—"}</td>
                          <td>{item.hips ?? "—"}</td>
                          <td>{item.shoulder ?? "—"}</td>
                          <td>{item.sleeve ?? "—"}</td>
                          <td>{item.length ?? "—"}</td>
                          <td>{item.notes || "—"}</td>
                          <td className="actions">
                            <button
                              className="edit-button"
                              onClick={() => editMeasurement(item)}
                            >
                              Edit
                            </button>
                            <button
                              className="delete-button"
                              onClick={() => deleteMeasurement(item.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {measurements.length === 0 && (
                        <tr>
                          <td colSpan="9" className="empty-state">
                            No measurements yet. Add a record above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
