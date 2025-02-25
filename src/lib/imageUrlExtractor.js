const express = require("express");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Logger } = require("telegram");
const ImageUrlExtractor = require("./imageUrlExtractor");
const fs = require("fs");
const input = require("input");
require("dotenv").config();

const app = express();
const port = 3000;

// Middleware para servir archivos estáticos (HTML, CSS, JS)
app.use(express.static("public"));

// Middleware para parsear JSON
app.use(express.json());

// Crear el cliente de Telegram
const stringSession = new StringSession(process.env.STRING_SESSION || "");
const client = new TelegramClient(
  stringSession,
  Number(process.env.API_ID),
  process.env.API_HASH,
  {
    connectionRetries: 5,
    baseLogger: new Logger(4), // LogLevel.ERROR
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

// Crear una instancia de ImageUrlExtractor
const imageUrlExtractor = new ImageUrlExtractor(client);

// Ruta para obtener las URLs de las imágenes recibidas
app.get("/get-image-urls", async (req, res) => {
  try {
    const imageUrls = [];

    // Escuchar imágenes recibidas
    imageUrlExtractor.listenForImages((imageUrl) => {
      imageUrls.push(imageUrl);
    });

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