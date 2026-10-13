require('dotenv').config();
const express = require('express');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar cuerpos JSON
app.use(express.json());

// Ruta raíz de comprobación
app.get('/', (req, res) => {
  res.send('API REST con persistencia en MySQL en funcionamiento.');
});

// 1. GET /api/recursos - Obtener todos los productos desde la base de datos
app.get('/api/recursos', async (req, res) => {
  try {
    const [filas] = await pool.query('SELECT * FROM productos');
    res.status(200).json(filas);
  } catch (error) {
    console.error('Error al consultar productos:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al consultar productos' });
  }
});

// 2. GET /api/recursos/:id - Obtener un producto por su ID
app.get('/api/recursos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [filas] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
    
    if (filas.length === 0) {
      return res.status(404).json({ mensaje: 'Recurso no encontrado' });
    }

    res.status(200).json(filas[0]);
  } catch (error) {
    console.error('Error al consultar el producto:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al consultar el producto' });
  }
});

// 3. POST /api/recursos - Crear un nuevo producto en la base de datos
app.post('/api/recursos', async (req, res) => {
  const { nombre, precio } = req.body;

  if (!nombre || precio === undefined) {
    return res.status(400).json({ mensaje: 'Los campos nombre y precio son obligatorios' });
  }

  try {
    const [resultado] = await pool.query(
      'INSERT INTO productos (nombre, precio) VALUES (?, ?)',
      [nombre, precio]
    );

    res.status(201).json({
      id: resultado.insertId,
      nombre,
      precio
    });
  } catch (error) {
    console.error('Error al insertar el producto:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al crear el producto' });
  }
});

// 4. PUT /api/recursos/:id - Actualizar un producto existente
app.put('/api/recursos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, precio } = req.body;

  try {
    // Comprobar si el recurso existe
    const [filas] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
    if (filas.length === 0) {
      return res.status(404).json({ mensaje: 'Recurso no encontrado para actualizar' });
    }

    const productoActual = filas[0];
    const nuevoNombre = nombre !== undefined ? nombre : productoActual.nombre;
    const nuevoPrecio = precio !== undefined ? precio : productoActual.precio;

    await pool.query(
      'UPDATE productos SET nombre = ?, precio = ? WHERE id = ?',
      [nuevoNombre, nuevoPrecio, id]
    );

    res.status(200).json({
      id: Number(id),
      nombre: nuevoNombre,
      precio: nuevoPrecio
    });
  } catch (error) {
    console.error('Error al actualizar el producto:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el producto' });
  }
});

// 5. DELETE /api/recursos/:id - Eliminar un producto por ID
app.delete('/api/recursos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [filas] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
    if (filas.length === 0) {
      return res.status(404).json({ mensaje: 'Recurso no encontrado para eliminar' });
    }

    await pool.query('DELETE FROM productos WHERE id = ?', [id]);

    res.status(200).json({
      mensaje: 'Recurso eliminado exitosamente',
      recurso: filas[0]
    });
  } catch (error) {
    console.error('Error al eliminar el producto:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el producto' });
  }
});

// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});