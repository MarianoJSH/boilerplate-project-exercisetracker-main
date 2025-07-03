const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config(); // Aunque no usaremos MONGO_URI, puede que quieras PORT

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// --- ALMACENAMIENTO EN MEMORIA ---
// Array para almacenar los usuarios y sus logs de ejercicio
// Cada usuario tendrá un objeto con { _id, username, log: [] }
let users = [];
let userIdCounter = 1; // Para generar IDs únicos
// --- FIN ALMACENAMIENTO EN MEMORIA ---

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});


// POST /api/users
// Crea un nuevo usuario
app.post('/api/users', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.json({ error: 'Username is required' });
  }

  // Comprobar si el usuario ya existe
  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    return res.json({ username: existingUser.username, _id: existingUser._id });
  }

  // Crear un nuevo usuario en memoria
  const newUser = {
    _id: (userIdCounter++).toString(), // Generar un ID simple
    username: username,
    log: [] // El log de ejercicios para este usuario
  };
  users.push(newUser);

  res.json({ username: newUser.username, _id: newUser._id });
});


// GET /api/users
// Obtiene una lista de todos los usuarios
app.get('/api/users', (req, res) => {
  // Devolver solo username y _id, como se espera
  const allUsers = users.map(user => ({
    username: user.username,
    _id: user._id
  }));
  res.json(allUsers);
});


// POST /api/users/:_id/exercises
// Añade un ejercicio a un usuario
app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.json({ error: 'Description and duration are required' });
  }

  // Buscar el usuario por ID
  const userIndex = users.findIndex(u => u._id === _id);
  if (userIndex === -1) {
    return res.json({ error: 'User not found' });
  }

  const user = users[userIndex];

  let exerciseDate;
  if (date) {
    exerciseDate = new Date(date);
    if (exerciseDate.toString() === 'Invalid Date') {
      return res.json({ error: 'Invalid Date format. Use yyyy-MM-DD.' });
    }
  } else {
    exerciseDate = new Date(); // Fecha actual si no se proporciona
  }

  const newExercise = {
    description: description,
    duration: parseInt(duration),
    date: exerciseDate
  };

  user.log.push(newExercise);

  // Devolver el objeto de usuario con el ejercicio añadido, formateando la fecha
  res.json({
    _id: user._id,
    username: user.username,
    date: newExercise.date.toDateString(), // Formato dateString
    duration: newExercise.duration,
    description: newExercise.description
  });
});


// GET /api/users/:_id/logs
// Recupera el log completo de ejercicios de un usuario, con filtros opcionales
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  // Buscar el usuario por ID
  const user = users.find(u => u._id === _id);
  if (!user) {
    return res.json({ error: 'User not found' });
  }

  let filteredLog = user.log;

  // Aplicar filtro 'from'
  if (from) {
    const fromDate = new Date(from);
    if (fromDate.toString() === 'Invalid Date') {
      return res.json({ error: 'Invalid "from" date format. Use yyyy-MM-DD.' });
    }
    filteredLog = filteredLog.filter(exercise => exercise.date >= fromDate);
  }

  // Aplicar filtro 'to'
  if (to) {
    const toDate = new Date(to);
    if (toDate.toString() === 'Invalid Date') {
      return res.json({ error: 'Invalid "to" date format. Use yyyy-MM-DD.' });
    }
    // Añadimos 23 horas, 59 minutos y 59 segundos para incluir todo el día 'to'
    toDate.setHours(23, 59, 59, 999);
    filteredLog = filteredLog.filter(exercise => exercise.date <= toDate);
  }

  // Aplicar filtro 'limit'
  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum <= 0) {
      return res.json({ error: 'Invalid "limit" parameter. Must be a positive integer.' });
    }
    filteredLog = filteredLog.slice(0, limitNum);
  }

  // Formatear las fechas en el log final
  const formattedLog = filteredLog.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString() // Formato dateString
  }));

  res.json({
    username: user.username,
    count: formattedLog.length,
    _id: user._id,
    log: formattedLog
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});