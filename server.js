// ============================================================
// server.js — InTech Backend con Node.js + Express + MySQL2
// ============================================================
// Instalar dependencias:
//   npm init -y
//   npm install express mysql2 cors dotenv
// ============================================================

require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));   // sirve los HTML estáticos

// ── Pool de conexión MySQL ───────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'intech_db',
  waitForConnections: true,
  connectionLimit: 10,
});

// ── Helpers de validación ────────────────────────────────────
function validarCedulaEcuatoriana(cedula) {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = parseInt(cedula.substring(0, 2));
  if (provincia < 1 || provincia > 24) return false;
  const digitos = cedula.split('').map(Number);
  const digitoVerificador = digitos[9];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let val = digitos[i];
    if (i % 2 === 0) {
      val *= 2;
      if (val > 9) val -= 9;
    }
    suma += val;
  }
  const residuo = suma % 10;
  const calculado = residuo === 0 ? 0 : 10 - residuo;
  return calculado === digitoVerificador;
}

function validarTelefono(tel) {
  return /^(09|0[2-7])\d{8}$/.test(tel);
}

function validarCorreo(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

// ── Rutas de página (SPA‑like) ───────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ╔══════════════════════════════════════════════════════════╗
// ║  API — CLIENTES                                          ║
// ╚══════════════════════════════════════════════════════════╝

// GET  /api/clientes  — listar todos
app.get('/api/clientes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM clientes ORDER BY fecha_registro DESC'
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: 'Error al obtener clientes', error: err.message });
  }
});

// GET  /api/clientes/:id  — obtener uno
app.get('/api/clientes/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: 'Cliente no encontrado' });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

// POST /api/clientes  — crear
app.post('/api/clientes', async (req, res) => {
  const { cedula, nombre, apellido, telefono, correo } = req.body;

  // Validaciones
  if (!cedula || !nombre || !apellido || !telefono || !correo)
    return res.status(400).json({ ok: false, mensaje: 'Todos los campos son obligatorios.' });

  if (!validarCedulaEcuatoriana(cedula))
    return res.status(400).json({ ok: false, mensaje: 'Cédula ecuatoriana inválida.' });

  if (!validarTelefono(telefono))
    return res.status(400).json({ ok: false, mensaje: 'Teléfono inválido. Debe tener 10 dígitos y comenzar con 09 o 0[2-7].' });

  if (!validarCorreo(correo))
    return res.status(400).json({ ok: false, mensaje: 'Correo electrónico inválido.' });

  if (nombre.trim().length < 2 || apellido.trim().length < 2)
    return res.status(400).json({ ok: false, mensaje: 'Nombre y apellido deben tener al menos 2 caracteres.' });

  try {
    const [result] = await pool.query(
      'INSERT INTO clientes (cedula, nombre, apellido, telefono, correo) VALUES (?,?,?,?,?)',
      [cedula.trim(), nombre.trim(), apellido.trim(), telefono.trim(), correo.trim().toLowerCase()]
    );
    res.status(201).json({ ok: true, mensaje: 'Cliente registrado exitosamente.', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const campo = err.message.includes('cedula') ? 'cédula' : 'correo';
      return res.status(409).json({ ok: false, mensaje: `Ya existe un cliente con ese ${campo}.` });
    }
    res.status(500).json({ ok: false, mensaje: 'Error al registrar cliente.', error: err.message });
  }
});

// PUT  /api/clientes/:id  — actualizar
app.put('/api/clientes/:id', async (req, res) => {
  const { cedula, nombre, apellido, telefono, correo } = req.body;

  if (!validarCedulaEcuatoriana(cedula))
    return res.status(400).json({ ok: false, mensaje: 'Cédula ecuatoriana inválida.' });
  if (!validarTelefono(telefono))
    return res.status(400).json({ ok: false, mensaje: 'Teléfono inválido.' });
  if (!validarCorreo(correo))
    return res.status(400).json({ ok: false, mensaje: 'Correo inválido.' });

  try {
    await pool.query(
      'UPDATE clientes SET cedula=?, nombre=?, apellido=?, telefono=?, correo=? WHERE id=?',
      [cedula, nombre, apellido, telefono, correo, req.params.id]
    );
    res.json({ ok: true, mensaje: 'Cliente actualizado.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

// DELETE /api/clientes/:id
app.delete('/api/clientes/:id', async (req, res) => {
  try {
    // Verificar si tiene ventas asociadas
    const [ventas] = await pool.query('SELECT id FROM ventas WHERE cliente_id = ? LIMIT 1', [req.params.id]);
    if (ventas.length)
      return res.status(409).json({ ok: false, mensaje: 'No se puede eliminar: el cliente tiene ventas registradas.' });

    await pool.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);
    res.json({ ok: true, mensaje: 'Cliente eliminado.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

// ╔══════════════════════════════════════════════════════════╗
// ║  API — PRODUCTOS                                         ║
// ╚══════════════════════════════════════════════════════════╝

app.get('/api/productos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos ORDER BY fecha_registro DESC');
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

app.get('/api/productos/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

app.post('/api/productos', async (req, res) => {
  const { numero_serie, descripcion, marca, precio_compra, margen_ganancia, cantidad_stock, estado } = req.body;

  if (!numero_serie || !descripcion || !marca || precio_compra === undefined || cantidad_stock === undefined)
    return res.status(400).json({ ok: false, mensaje: 'Todos los campos obligatorios deben completarse.' });

  if (isNaN(precio_compra) || Number(precio_compra) < 0)
    return res.status(400).json({ ok: false, mensaje: 'El precio de compra debe ser un número positivo.' });

  const margen = Number(margen_ganancia) || 30;
  if (margen < 0 || margen > 1000)
    return res.status(400).json({ ok: false, mensaje: 'El margen de ganancia debe estar entre 0 y 1000.' });

  if (!Number.isInteger(Number(cantidad_stock)) || Number(cantidad_stock) < 0)
    return res.status(400).json({ ok: false, mensaje: 'La cantidad en stock debe ser un número entero positivo.' });

  if (!['Activo', 'Inactivo'].includes(estado))
    return res.status(400).json({ ok: false, mensaje: 'Estado inválido.' });

  try {
    const [result] = await pool.query(
      'INSERT INTO productos (numero_serie, descripcion, marca, precio_compra, margen_ganancia, cantidad_stock, estado) VALUES (?,?,?,?,?,?,?)',
      [numero_serie.trim(), descripcion.trim(), marca.trim(), precio_compra, margen, cantidad_stock, estado]
    );
    res.status(201).json({ ok: true, mensaje: 'Producto registrado exitosamente.', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ ok: false, mensaje: 'Ya existe un producto con ese número de serie.' });
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  const { numero_serie, descripcion, marca, precio_compra, margen_ganancia, cantidad_stock, estado } = req.body;
  try {
    await pool.query(
      'UPDATE productos SET numero_serie=?, descripcion=?, marca=?, precio_compra=?, margen_ganancia=?, cantidad_stock=?, estado=? WHERE id=?',
      [numero_serie, descripcion, marca, precio_compra, margen_ganancia || 30, cantidad_stock, estado, req.params.id]
    );
    res.json({ ok: true, mensaje: 'Producto actualizado.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

app.delete('/api/productos/:id', async (req, res) => {
  try {
    const [ventas] = await pool.query('SELECT id FROM ventas WHERE producto_id = ? LIMIT 1', [req.params.id]);
    if (ventas.length)
      return res.status(409).json({ ok: false, mensaje: 'No se puede eliminar: el producto tiene ventas registradas.' });
    await pool.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
    res.json({ ok: true, mensaje: 'Producto eliminado.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

// ╔══════════════════════════════════════════════════════════╗
// ║  API — VENTAS                                            ║
// ╚══════════════════════════════════════════════════════════╝

app.get('/api/ventas', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.*, 
             CONCAT(c.nombre,' ',c.apellido) AS cliente_nombre, c.cedula,
             p.descripcion AS producto_nombre, p.numero_serie
      FROM ventas v
      JOIN clientes c  ON c.id = v.cliente_id
      JOIN productos p ON p.id = v.producto_id
      ORDER BY v.fecha_registro DESC
    `);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

app.post('/api/ventas', async (req, res) => {
  const { fecha_venta, cliente_id, producto_id, cantidad } = req.body;

  if (!fecha_venta || !cliente_id || !producto_id || !cantidad)
    return res.status(400).json({ ok: false, mensaje: 'Todos los campos son obligatorios.' });

  if (!Number.isInteger(Number(cantidad)) || Number(cantidad) < 1)
    return res.status(400).json({ ok: false, mensaje: 'La cantidad debe ser un número entero mayor a 0.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verificar stock
    const [[producto]] = await conn.query(
      'SELECT pvp, cantidad_stock FROM productos WHERE id = ? AND estado = "Activo" FOR UPDATE',
      [producto_id]
    );
    if (!producto)
      throw { status: 404, mensaje: 'Producto no encontrado o inactivo.' };
    if (producto.cantidad_stock < Number(cantidad))
      throw { status: 409, mensaje: `Stock insuficiente. Disponible: ${producto.cantidad_stock} unidad(es).` };

    // Calcular totales
    const pvp      = Number(producto.pvp);
    const qty      = Number(cantidad);
    const subtotal = parseFloat((pvp * qty / 1.12).toFixed(2));
    const iva      = parseFloat((pvp * qty - subtotal).toFixed(2));
    const total    = parseFloat((pvp * qty).toFixed(2));

    // Insertar venta
    const [result] = await conn.query(
      'INSERT INTO ventas (fecha_venta, cliente_id, producto_id, cantidad, subtotal, iva, total) VALUES (?,?,?,?,?,?,?)',
      [fecha_venta, cliente_id, producto_id, qty, subtotal, iva, total]
    );

    // Descontar stock
    await conn.query(
      'UPDATE productos SET cantidad_stock = cantidad_stock - ? WHERE id = ?',
      [qty, producto_id]
    );

    await conn.commit();
    res.status(201).json({ ok: true, mensaje: 'Venta registrada exitosamente.', id: result.insertId, total });
  } catch (err) {
    await conn.rollback();
    const status = err.status || 500;
    res.status(status).json({ ok: false, mensaje: err.mensaje || err.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/ventas/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[venta]] = await conn.query('SELECT * FROM ventas WHERE id = ?', [req.params.id]);
    if (!venta) throw { status: 404, mensaje: 'Venta no encontrada.' };

    // Restaurar stock
    await conn.query(
      'UPDATE productos SET cantidad_stock = cantidad_stock + ? WHERE id = ?',
      [venta.cantidad, venta.producto_id]
    );
    await conn.query('DELETE FROM ventas WHERE id = ?', [req.params.id]);
    await conn.commit();
    res.json({ ok: true, mensaje: 'Venta eliminada y stock restaurado.' });
  } catch (err) {
    await conn.rollback();
    res.status(err.status || 500).json({ ok: false, mensaje: err.mensaje || err.message });
  } finally {
    conn.release();
  }
});

// ── Estadísticas para el dashboard ───────────────────────────
app.get('/api/estadisticas', async (req, res) => {
  try {
    const [[{ total_clientes }]]   = await pool.query('SELECT COUNT(*) AS total_clientes FROM clientes');
    const [[{ total_productos }]]  = await pool.query('SELECT COUNT(*) AS total_productos FROM productos WHERE estado="Activo"');
    const [[{ total_ventas }]]     = await pool.query('SELECT COUNT(*) AS total_ventas FROM ventas');
    const [[{ ingresos_totales }]] = await pool.query('SELECT COALESCE(SUM(total),0) AS ingresos_totales FROM ventas');
    const [[{ stock_bajo }]]       = await pool.query('SELECT COUNT(*) AS stock_bajo FROM productos WHERE cantidad_stock < 5 AND estado="Activo"');
    res.json({ ok: true, data: { total_clientes, total_productos, total_ventas, ingresos_totales, stock_bajo } });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

// ── Iniciar servidor ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  InTech Server corriendo en http://localhost:${PORT}`);
});
