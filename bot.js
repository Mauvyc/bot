const { Logger } = require("telegram"); // Importa Logger desde telegram
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input");
const fs = require("fs");
const { CreateClient } = require("./src/lib/createClient");
require("dotenv").config();

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
  console.log("Bot is starting...");

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

module.exports = client;