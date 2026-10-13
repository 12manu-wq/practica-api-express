const mysql = require('mysql2/promise');
require('dotenv').config();

// Crear el pool de conexiones utilizando las variables de entorno
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'api_practica',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Probar la conexión al iniciar
pool.getConnection()
  .then(connection => {
    console.log('Conectado exitosamente a la base de datos MySQL');
    connection.release();
  })
  .catch(error => {
    console.error('Error al conectar a la base de datos:', error.message);
  });

module.exports = pool;