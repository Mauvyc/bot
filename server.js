const express = require("express");
const { CreateClient } = require("./src/lib/createClient");
const { StringSession } = require("telegram/sessions");
const { Logger, Api } = require("telegram");
const fs = require("fs");
const input = require("input"); // Asegúrate de tener esta dependencia instalada
require("dotenv").config();

const app = express();
const port = 3000;

// Middleware para servir archivos estáticos (HTML, CSS, JS)
app.use(express.static("public"));

// Middleware para parsear JSON
app.use(express.json());

// Crear el cliente de Telegram
const stringSession = new StringSession(process.env.STRING_SESSION || "");
const client = new CreateClient(
  stringSession,
  Number(process.env.API_ID),
  process.env.API_HASH,
  {
    connectionRetries: 5,
    baseLogger: new Logger(4), // 4 corresponde a LogLevel.ERROR
  }
);

// Iniciar sesión en Telegram
(async () => {
  await client.start({
    phoneNumber: async () => await input.text("number ?"),
    password: async () => await input.text("password?"),
    phoneCode: async () => await input.text("Code ?"),
    onError: (err) => console.log(err),
  });

  if (process.env.STRING_SESSION === "") {
    const sessionString = client.session.save();
    let file = fs.readFileSync(".env", "utf8");

    // Reemplaza la línea STRING_SESSION existente o agrega una nueva si no existe
    if (file.includes("STRING_SESSION=")) {
      file = file.replace(/STRING_SESSION=.*/, `STRING_SESSION=${sessionString}`);
    } else {
      file += `\nSTRING_SESSION=${sessionString}`;
    }

    fs.writeFileSync(".env", file);
  }

  console.log("Bot is ready.");
})();

// Ruta para enviar el mensaje
app.post("/send-message", async (req, res) => {
  try {
    const { command } = req.body; // Obtén el comando desde el frontend

    if (!command) {
      return res.status(400).json({ success: false, error: "Comando no proporcionado." });
    }

    const targetUsername = "@Mibotcamara_bot"; // Nombre de usuario del bot

    // Envía el comando al bot de Telegram
    await client.sendMessage(targetUsername, {
      message: command, // Envía el comando como mensaje
    });

    res.status(200).json({ success: true, message: `Comando "${command}" enviado correctamente.` });
  } catch (error) {
    console.error("Error al enviar el mensaje:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener las URLs de las imágenes recibidas de un usuario específico
app.get("/get-image-urls", async (req, res) => {
  try {
    const imageUrls = [];

    client.addEventHandler(async (event) => {
        const message = event.message;
      
        // Verificar si el mensaje es del usuario específico y contiene una imagen
        if (
          message.sender?.username === "Mibotcamara_bot" && // Filtra por el usuario específico
          message.media instanceof Api.MessageMediaPhoto
        ) {
          console.log("Imagen recibida de @Mibotcamara_bot.");
      
          // Obtener la URL de la imagen
          const file = await client.downloadMedia(message.media, {
            workers: 1,
          });
      
          if (file) {
            console.log(`URL de la imagen: ${file}`);
            imageUrls.push(file);
          }
        }
      }, new Api.UpdateNewMessage({})); // Usar Api.UpdateNewMessage en lugar de Api.NewMessage
    res.status(200).json({ success: true, imageUrls });
  } catch (error) {
    console.error("Error al obtener las URLs de las imágenes:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});