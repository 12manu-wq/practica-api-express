const express = require('express');
const app = express();
const PORT = 3000;

// Middleware para parsear cuerpos de solicitudes en formato JSON
app.use(express.json());

// Arreglo en memoria simulando la colección de datos
let productos = [
  { id: 1, nombre: 'Laptop Lenovo', precio: 12500 },
  { id: 2, nombre: 'Mouse Inalámbrico', precio: 350 },
  { id: 3, nombre: 'Teclado Mecánico', precio: 950 }
];

// Ruta base para confirmar que el servidor está en línea
app.get('/', (req, res) => {
  res.send('Servidor en línea y funcionando correctamente.');
});

// 1. GET /api/recursos - Obtener todos los elementos
app.get('/api/recursos', (req, res) => {
  res.status(200).json(productos);
});

// 2. GET /api/recursos/:id - Obtener un elemento por su ID
app.get('/api/recursos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const producto = productos.find(p => p.id === id);

  if (!producto) {
    return res.status(404).json({ mensaje: 'Recurso no encontrado' });
  }

  res.status(200).json(producto);
});

// 3. POST /api/recursos - Crear un nuevo elemento con ID dinámico
app.post('/api/recursos', (req, res) => {
  const { nombre, precio } = req.body;

  // Generar ID dinámico tomando el máximo actual + 1
  const nuevoId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;

  const nuevoProducto = {
    id: nuevoId,
    nombre,
    precio
  };

  productos.push(nuevoProducto);
  res.status(201).json(nuevoProducto);
});

// 4. PUT /api/recursos/:id - Actualizar un elemento existente
app.put('/api/recursos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const productoIndex = productos.findIndex(p => p.id === id);

  if (productoIndex === -1) {
    return res.status(404).json({ mensaje: 'Recurso no encontrado para actualizar' });
  }

  const { nombre, precio } = req.body;

  productos[productoIndex] = {
    id,
    nombre: nombre || productos[productoIndex].nombre,
    precio: precio !== undefined ? precio : productos[productoIndex].precio
  };

  res.status(200).json(productos[productoIndex]);
});

// 5. DELETE /api/recursos/:id - Eliminar un elemento por ID
app.delete('/api/recursos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const productoIndex = productos.findIndex(p => p.id === id);

  if (productoIndex === -1) {
    return res.status(404).json({ mensaje: 'Recurso no encontrado para eliminar' });
  }

  const eliminado = productos.splice(productoIndex, 1);
  res.status(200).json({
    mensaje: 'Recurso eliminado exitosamente',
    recurso: eliminado[0]
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});