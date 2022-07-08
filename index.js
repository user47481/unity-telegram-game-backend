require("dotenv").config();
const express = require("express");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

const gameName = "YOUR_GAME_NAME_GOES_HERE";
const webURL = "www.YOUR_URL.com";

const server = express();
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const port = process.env.PORT || 5000;

const queries = {};

bot.onText(/\/help/, (msg) =>
  bot.sendMessage(
    msg.from.id,
    "This bot implements a simple game. Say /game if you want to play."
  )
);
bot.onText(/\/start|\/game/, (msg) => bot.sendGame(msg.from.id, gameName));
bot.on("callback_query", function (query) {
    if (query.game_short_name !== gameName) {
        bot.answerCallbackQuery(query.id, "Sorry, '" + query.game_short_name + "' is not available.");
    } else {
        queries[query.id] = query;
    const gameurl = `https://${webURL}/index.html?id=${query.id}`;
    bot.answerCallbackQuery(query.id, { url: gameurl });
    }
});
bot.on("inline_query", function(iq) {
      bot.answerInlineQuery(iq.id, [ { type: "game", id: "0", game_short_name: gameName } ] ); 
});

server.use(express.static(path.join(__dirname, 'public')));

server.get("/highscore/:score", function(req, res, next) {
    if (!Object.hasOwnProperty.call(queries, req.query.id)) return next();
  const query = queries[req.query.id];
  const score = parseInt(req.params.score);
    let options;
    if (query.message) {
        options = {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id
        };
    } else {
        options = {
            inline_message_id: query.inline_message_id
        };
    }
  bot
    .setGameScore(query.from.id, score, options)
    .then((b) => {
      return res.status(200).send("Score added successfully");
    })
    .catch((err) => {
      if (
        err.response.body.description === "Bad Request: BOT_SCORE_NOT_MODIFIED"
      ) {
        return res
          .status(204)
          .send("New score is inferior to user's previous one");
      }
      return res.status(500);
    });
  return;
});
server.listen(port);
