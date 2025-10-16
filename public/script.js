// client/script.js
const socket = io( ); // IP del servidor

let usuario = null;
let usuarioDestino = null;

// --- ELEMENTOS ---
const registroDiv = document.getElementById('registro');
const loginDiv = document.getElementById('login');
const chatDiv = document.getElementById('chat');
const regNombre = document.getElementById('regNombre');
const regPass = document.getElementById('regPass');
const loginNombre = document.getElementById('loginNombre');
const loginPass = document.getElementById('loginPass');
const mensajesDiv = document.getElementById('mensajes');
const chatPrivadoDiv = document.getElementById('chatMensajesPrivados');
const mensajeInput = document.getElementById('mensaje');
const mensajePrivadoInput = document.getElementById('mensajePrivado');
const listaUsuarios = document.getElementById('usuariosLista');

// --- BOTONES ---
document.getElementById('btnRegistrar').onclick = registrar;
document.getElementById('btnLogin').onclick = login;
document.getElementById('btnEnviar').onclick = enviarMensaje;
document.getElementById('linkLogin').onclick = () => {
  registroDiv.classList.add('hidden');
  loginDiv.classList.remove('hidden');
};
document.getElementById('linkRegistro').onclick = () => {
  loginDiv.classList.add('hidden');
  registroDiv.classList.remove('hidden');
};

// --- FUNCIONES ---
// Registro
async function registrar() {
  const nombre = regNombre.value;
  const contrasena = regPass.value;
  if (!nombre || !contrasena) return alert('Completa todos los campos');

  const res = await fetch('/registrar', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ nombre, contrasena })
  });

  const data = await res.json();
  if (res.ok) {
    alert('Registrado con éxito');
    registroDiv.classList.add('hidden');
    loginDiv.classList.remove('hidden');
  } else alert(data.error);
}

// Login
async function login() {
  const nombre = loginNombre.value;
  const contrasena = loginPass.value;
  if (!nombre || !contrasena) return alert('Completa todos los campos');

  const res = await fetch('/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ nombre, contrasena })
  });

  const data = await res.json();
  if (res.ok) {
    usuario = data;
    socket.emit('iniciarSesion', usuario);
    loginDiv.classList.add('hidden');
    chatDiv.classList.remove('hidden');
  } else alert(data.error);
}

// Mensaje público
function enviarMensaje() {
  const mensaje = mensajeInput.value;
  if (!mensaje) return;
  socket.emit('enviarMensaje', { usuario_id: usuario.id, nombre: usuario.nombre, mensaje });
  mensajeInput.value = '';
}

// Mensaje privado
function enviarMensajePrivado() {
  const mensaje = mensajePrivadoInput.value;
  if (!mensaje || !usuarioDestino) return alert('Selecciona un usuario y escribe un mensaje');

  socket.emit('enviarMensajePrivado', {
    deId: usuario.id,
    paraId: usuarioDestino.id, // ahora es el real
    mensaje
  });

  mensajePrivadoInput.value = '';
}


// --- SOCKET.IO ESCUCHAS ---
socket.on('nuevoMensaje', (data) => {
  const div = document.createElement('div');
  div.textContent = `${data.nombre}: ${data.mensaje}`;
  div.classList.add(data.nombre === usuario.nombre ? 'mensaje-propio' : 'mensaje-ajeno');
  mensajesDiv.appendChild(div);
  mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
});

// Mensajes privados
socket.on('nuevoMensajePrivado', (data) => {
  const div = document.createElement('div');
  
  // Mostrar "Tú" si eres el remitente
  const nombreRemitente = data.de === usuario.nombre ? 'Tú' : data.de;
  
  div.textContent = `${nombreRemitente}: ${data.mensaje}`;
  div.classList.add(nombreRemitente === 'Tú' ? 'mensaje-propio' : 'mensaje-ajeno');
  
  chatPrivadoDiv.appendChild(div);
  chatPrivadoDiv.scrollTop = chatPrivadoDiv.scrollHeight;
});


socket.on('usuariosConectados', (usuarios) => {
  listaUsuarios.innerHTML = '';
  usuarios.forEach(u => {
    if (u !== usuario.nombre) {
      const li = document.createElement('li');
      li.textContent = u.nombre ? u.nombre : u; // mostrar nombre correctamente

      li.onclick = () => {
        // Quitar clase 'seleccionado' de todos
        listaUsuarios.querySelectorAll('li').forEach(li => li.classList.remove('seleccionado'));
        // Resaltar usuario seleccionado
        li.classList.add('seleccionado');
        // Guardar objeto completo como destino
        usuarioDestino = u.nombre ? u : { nombre: u, id: null };
      };

      listaUsuarios.appendChild(li);
    }
  });
});



