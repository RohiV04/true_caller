const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const truecallerjs = require("truecallerjs");
require("dotenv").config();
// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;
const app = express();
app.get("/", (req, res) => {
  res.send("Hello World");
});
app.listen(process.env.PORT || 9000, () => {
  console.log(`Server is running on ${process.env.PORT || 9000}...`);
});
const bot = new TelegramBot(token, { polling: true });

let backoffTime = 1000; // Start with a 1 second backoff time

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `Welcome! You can search for a phone number by sending it to me.`
  );
});

bot.onText(/(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const phoneNumber = match[1];

  const searchData = {
    number: phoneNumber,
    countryCode: "IN",
    installationId: process.env.TRUECALLER_INSTALLATION_ID,
  };

  bot.sendMessage(
    chatId,
    `Searching for information related to the number: ${phoneNumber}. Please wait...`
  );

  while (true) {
    try {
      const response = await truecallerjs.search(searchData);

      if (response) {
        console.log("Response:", response); // Log the response to help debug

        if (typeof response.getName === "function") {
          let message = `Here's the information I found for the number ${phoneNumber}:\n`;
          message += `Name: ${response.getName() || "Not available"}\n`;
          message += `Alternate Name: ${
            response.getAlternateName() || "Not available"
          }\n`;
          message += `Email: ${response.getEmailId() || "Not available"}\n`;
          const countryDetails = response.getCountryDetails();
          message += `Country: ${countryDetails.name || "Not available"}\n`;
          message += `Currency: ${
            countryDetails.currency
              ? countryDetails.currency.join(", ")
              : "Not available"
          }\n`;
          message += `Languages: ${
            countryDetails.languages
              ? countryDetails.languages.join(", ")
              : "Not available"
          }\n`;

          bot.sendMessage(chatId, message);
        } else {
          bot.sendMessage(
            chatId,
            `I'm sorry, but I couldn't find any information related to the number: ${phoneNumber}.`
          );
        }
      }

      break; // Break the loop if the request was successful
    } catch (error) {
      if (error.response && error.response.status === 429) {
        // If a 429 status code was received, wait the backoff time then continue the loop
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        backoffTime *= 2; // Double the backoff time for the next request
      } else {
        // If the error was not a 429, rethrow it
        bot.sendMessage(
          chatId,
          `I'm sorry, but an error occurred while searching for the number: ${phoneNumber}. Please try again later.`
        );
        throw error;
      }
    }
  }
});
