import 'babel/polyfill';
import mongoose from 'mongoose';
import express from 'express';
import bodyParser from 'body-parser';
import {join} from 'path';
import {dust} from 'adaro';

import trebek from './trebek';
import {lock, unlock} from './trebek/locks';
import Game from './models/Game';
import Contestant from './models/Contestant';
import * as config from './config';

mongoose.connect(config.MONGO);

const app = express();

app.engine('dust', dust());
app.set('view engine', 'dust');
app.set('views', join(__dirname, 'views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.post('/command', async (req, res) => {
  // Ignore unverified messages:
  if (config.VERIFY_TOKEN && config.VERIFY_TOKEN !== req.body.token) {
    return res.end();
  }
  // Ignore messages from ourself:
  if (req.body.user_id === config.BOT_ID || req.body.user_name === config.USERNAME) {
    return res.end();
  }

  let input = req.body.text;
  // Parse out the trigger word:
  if (req.body.trigger_word) {
    const replacer = new RegExp(trigger_word, '');
    input = input.replace(replacer, '');
  }

  const response = await trebek(input, req.body);

  if (response) {
    res.json({
      username: config.USERNAME,
      icon_emoji: ':jbot:',
      text: response
    });
  } else {
    res.end();
  }
});

// Heroku landing page:
app.get('/welcome', (req, res) => {
  res.render('welcome');
});

// Anything rendered by our capturing service goes through here:
app.get('/renderable/:view', (req, res) => {
  res.render(req.params.view, {
    data: decodeURIComponent(req.query.data)
  });
});

// Boot up the jeopardy app:
app.listen(config.PORT, () => {
  console.log(`Jeopardy Bot listening on port ${config.PORT}`);
});
