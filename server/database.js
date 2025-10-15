// server/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'chat.db'));

// Crear tablas si no existen
db.serialize(() => {
  // Tabla usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      contrasena TEXT NOT NULL
    )
  `);

  // Mensajes públicos
  db.run(`
    CREATE TABLE IF NOT EXISTS mensajes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      mensaje TEXT NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
    )
  `);

  // Mensajes privados
  db.run(`
    CREATE TABLE IF NOT EXISTS mensajes_privados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      de_id INTEGER NOT NULL,
      para_id INTEGER NOT NULL,
      mensaje TEXT NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(de_id) REFERENCES usuarios(id),
      FOREIGN KEY(para_id) REFERENCES usuarios(id)
    )
  `);
});

module.exports = db;
