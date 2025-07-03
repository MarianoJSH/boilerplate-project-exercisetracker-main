const express = require("express");
const mongoose = require("mongoose");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser"); // Para parsear los datos del formulario
require("dotenv").config();

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Conectado a MongoDB Atlas"))
  .catch((err) => console.error("Error al conectar a MongoDB:", err));

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false })); // Para parsear datos de formularios
app.use(bodyParser.json()); // Para parsear JSON

const exerciseSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  log: [exerciseSchema],
});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.json({ error: "Username is required" });
  }

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.json({ username: user.username, _id: user._id });
    }

    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    res.json({ error: "Error creating user", details: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id");
    res.json({ users });
  } catch (error) {
    res.json({ error: "Error fetching users", details: error.message });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.params;

  if (!description || !duration) {
    return res.json({ error: "Invalid description or duration" });
  }

  let exerciseDate = date ? new Date(date) : new Date();

  if (exerciseDate.toString() === "Invalid Date") {
    return res.json({
      error: "Error on the Date format, use the format YYYY-MM-DD",
    });
  }

  try {
    const user = await User.findById(_id);

    if (!user) {
      return res.json({ error: "User not found" });
    }

    const newExercise = {
      description: description,
      duration: parseInt(duration),
      date: exerciseDate,
    };

    user.log.push(newExercise);
    await user.save();
    res.json({
      _id: user._id,
      username: user.username,
      date: newExercise.date.toDateString(),
      duration: newExercise.duration,
      description: newExercise.description,
    });
  } catch (error) {
    res.json({ error: "Error adding exercise", details: error.message });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);

    if (!user) {
      return res.json({ error: "User not found" });
    }

    let log = user.log;

    if (from) {
      const fromDate = new Date(from);
      if (fromDate.toString() === "Invalid Date") {
        return res.json({
          error: 'Invalid "from" date format. Use YYYY-MM-DD.',
        });
      }
      log = log.filter((exercise) => exercise.date >= fromDate);
    }

    // Aplicar filtro 'to'
    if (to) {
      const toDate = new Date(to);
      if (toDate.toString() === "Invalid Date") {
        return res.json({ error: 'Invalid "to" date format. Use YYYY-MM-DD.' });
      }
      // Añadimos 23 horas, 59 minutos y 59 segundos para incluir todo el día 'to'
      toDate.setHours(23, 59, 59, 999);
      log = log.filter((exercise) => exercise.date <= toDate);
    }

    // Aplicar filtro 'limit'
    if (limit) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum <= 0) {
        return res.json({
          error: 'Invalid "limit" parameter. Must be a positive integer.',
        });
      }
      log = log.slice(0, limitNum);
    }

    // Formatear las fechas en el log
    const formattedLog = log.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(), // Formato dateString
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: formattedLog.length,
      log: formattedLog,
    });
  } catch (err) {
    res.json({ error: "Error fetching exercise log", details: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
