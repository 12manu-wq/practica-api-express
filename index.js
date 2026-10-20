require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Multer para almacenamiento temporal
const upload = multer({ dest: 'uploads/' });

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta raíz
app.get('/', (req, res) => {
  res.send('API REST con soporte de persistencia y procesamiento por lotes (JSON/CSV).');
});

// ==========================================
// RUTAS CRUD (Prácticas anteriores)
// ==========================================

// GET /api/recursos - Listar todos los productos
app.get('/api/recursos', async (req, res) => {
  try {
    const [filas] = await pool.query('SELECT * FROM productos');
    res.status(200).json(filas);
  } catch (error) {
    console.error('Error al consultar productos:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al consultar productos' });
  }
});

// GET /api/recursos/:id - Obtener producto por ID
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

// POST /api/recursos - Insertar producto unitario
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
    res.status(201).json({ id: resultado.insertId, nombre, precio });
  } catch (error) {
    console.error('Error al insertar el producto:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al crear el producto' });
  }
});

// PUT /api/recursos/:id - Actualizar producto
app.put('/api/recursos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, precio } = req.body;
  try {
    const [filas] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
    if (filas.length === 0) {
      return res.status(404).json({ mensaje: 'Recurso no encontrado para actualizar' });
    }
    const productoActual = filas[0];
    const nuevoNombre = nombre !== undefined ? nombre : productoActual.nombre;
    const nuevoPrecio = precio !== undefined ? precio : productoActual.precio;

    await pool.query('UPDATE productos SET nombre = ?, precio = ? WHERE id = ?', [nuevoNombre, nuevoPrecio, id]);
    res.status(200).json({ id: Number(id), nombre: nuevoNombre, precio: nuevoPrecio });
  } catch (error) {
    console.error('Error al actualizar el producto:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el producto' });
  }
});

// DELETE /api/recursos/:id - Eliminar producto
app.delete('/api/recursos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [filas] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
    if (filas.length === 0) {
      return res.status(404).json({ mensaje: 'Recurso no encontrado para eliminar' });
    }
    await pool.query('DELETE FROM productos WHERE id = ?', [id]);
    res.status(200).json({ mensaje: 'Recurso eliminado exitosamente', recurso: filas[0] });
  } catch (error) {
    console.error('Error al eliminar el producto:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el producto' });
  }
});

// ==========================================
// PARTE II: IMPORTACIÓN POR LOTES (JSON / CSV)
// ==========================================
app.post('/api/recursos/importar', upload.single('archivo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ mensaje: 'No se ha adjuntado ningún archivo bajo el campo "archivo".' });
  }

  const rutaArchivo = req.file.path;
  const extension = path.extname(req.file.originalname).toLowerCase();
  let productosAInsertar = [];

  try {
    if (extension === '.json') {
      const contenido = fs.readFileSync(rutaArchivo, 'utf8');
      const datosParseados = JSON.parse(contenido);
      productosAInsertar = Array.isArray(datosParseados) ? datosParseados : [datosParseados];
    } else if (extension === '.csv') {
      productosAInsertar = await new Promise((resolve, reject) => {
        const filas = [];
        fs.createReadStream(rutaArchivo)
          .pipe(csv())
          .on('data', (fila) => filas.push(fila))
          .on('end', () => resolve(filas))
          .on('error', (err) => reject(err));
      });
    } else {
      fs.unlinkSync(rutaArchivo);
      return res.status(400).json({ mensaje: 'Formato no soportado. Debe ser un archivo .json o .csv' });
    }

    if (productosAInsertar.length === 0) {
      fs.unlinkSync(rutaArchivo);
      return res.status(400).json({ mensaje: 'El archivo está vacío o no contiene registros válidos.' });
    }

    // Inserción masiva en MySQL
    const valores = productosAInsertar.map(p => [p.nombre, parseFloat(p.precio)]);
    const [resultado] = await pool.query(
      'INSERT INTO productos (nombre, precio) VALUES ?',
      [valores]
    );

    // Eliminar archivo temporal tras el procesamiento exitoso
    fs.unlinkSync(rutaArchivo);

    res.status(200).json({
      mensaje: 'Importación por lotes completada con éxito',
      totalInsertados: resultado.affectedRows
    });
  } catch (error) {
    if (fs.existsSync(rutaArchivo)) {
      fs.unlinkSync(rutaArchivo);
    }
    console.error('Error durante la importación:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al procesar el archivo', detalle: error.message });
  }
});

// ==========================================
// PARTE III: EXPORTACIÓN (JSON / CSV)
// ==========================================
app.get('/api/recursos/exportar/:formato', async (req, res) => {
  const { formato } = req.params;

  try {
    const [filas] = await pool.query('SELECT id, nombre, precio FROM productos');

    if (formato.toLowerCase() === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename=datos_exportados.json');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(filas);
    } else if (formato.toLowerCase() === 'csv') {
      const json2csvParser = new Parser({ fields: ['id', 'nombre', 'precio'] });
      const csvData = json2csvParser.parse(filas);

      res.setHeader('Content-Disposition', 'attachment; filename=datos_exportados.csv');
      res.setHeader('Content-Type', 'text/csv');
      return res.status(200).send(csvData);
    } else {
      return res.status(400).json({ mensaje: 'Formato no válido. Utilice "json" o "csv".' });
    }
  } catch (error) {
    console.error('Error al exportar los datos:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al exportar datos' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});