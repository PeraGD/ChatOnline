// server/app.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",      // Permitir todos los orígenes (para pruebas en LAN)
    methods: ["GET", "POST"]
  }
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../client')));

const usuariosConectados = {}; // { socketId: { id, nombre } }

// =================== RUTAS HTTP ===================

// Registro
app.post('/registrar', async (req, res) => {
  const { nombre, contrasena } = req.body;
  if (!nombre || !contrasena) return res.status(400).json({ error: 'Completa todos los campos' });

  const hash = await bcrypt.hash(contrasena, 10);

  db.run('INSERT INTO usuarios (nombre, contrasena) VALUES (?, ?)', [nombre, hash], function(err) {
    if (err) return res.status(400).json({ error: 'Usuario ya existe' });
    res.json({ id: this.lastID, nombre });
  });
});

// Login
app.post('/login', (req, res) => {
  const { nombre, contrasena } = req.body;
  if (!nombre || !contrasena) return res.status(400).json({ error: 'Completa todos los campos' });

  db.get('SELECT * FROM usuarios WHERE nombre = ?', [nombre], async (err, row) => {
    if (err || !row) return res.status(400).json({ error: 'Usuario no encontrado' });

    const ok = await bcrypt.compare(contrasena, row.contrasena);
    if (!ok) return res.status(400).json({ error: 'Contraseña incorrecta' });

    res.json({ id: row.id, nombre: row.nombre });
  });
});

// =================== SOCKET.IO ===================
io.on('connection', (socket) => {
  console.log('Usuario conectado');

  // Guardar usuario al iniciar sesión
  socket.on('iniciarSesion', (usuario) => {
    usuariosConectados[socket.id] = { id: usuario.id, nombre: usuario.nombre };
    io.emit('usuariosConectados', Object.values(usuariosConectados));
  });

  // Mensajes públicos
  socket.on('enviarMensaje', (data) => {
    const { usuario_id, nombre, mensaje } = data;
    db.run('INSERT INTO mensajes (usuario_id, mensaje) VALUES (?, ?)', [usuario_id, mensaje], function(err) {
      if (err) return console.error(err);
      io.emit('nuevoMensaje', { id: this.lastID, nombre, mensaje, fecha: new Date().toISOString() });
    });
  });

  // Mensajes privados
socket.on('enviarMensajePrivado', (data) => {
  const { deId, paraId, mensaje } = data;

  // Guardar en la base de datos
  db.run(
    'INSERT INTO mensajes_privados (de_id, para_id, mensaje) VALUES (?, ?, ?)',
    [deId, paraId, mensaje],
    function(err) {
      if (err) return console.error(err);

      // Obtener los nombres reales de remitente y destinatario
      db.get(
        `SELECT mp.id, u1.nombre AS de, u2.nombre AS para, mp.mensaje, mp.fecha
         FROM mensajes_privados mp
         JOIN usuarios u1 ON mp.de_id = u1.id
         JOIN usuarios u2 ON mp.para_id = u2.id
         WHERE mp.id = ?`,
        [this.lastID],
        (err, row) => {
          if (err || !row) return console.error(err);

          // Emitir solo a los sockets correspondientes
          for (let [socketId, u] of Object.entries(usuariosConectados)) {
            if (u.id === deId || u.id === paraId) {
              io.to(socketId).emit('nuevoMensajePrivado', row);
            }
          }
        }
      );
    }
  );
});
  // Desconexión
  socket.on('disconnect', () => {
    delete usuariosConectados[socket.id];
    io.emit('usuariosConectados', Object.values(usuariosConectados));
    console.log('Usuario desconectado');
  });
});

// =================== INICIAR SERVIDOR ===================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

