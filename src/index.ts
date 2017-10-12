import * as express from 'express';
import 'colors';
import * as moment from 'moment';
import * as telegraf from 'telegraf';
import * as request from 'superagent';
import * as _ from 'lodash';
import * as redis from 'redis';
import * as bodyParser from 'body-parser';

// constants
const http = require('http');
const app = express();
const config = require('../config.json');
const bot = new telegraf(config.tgToken);

console.log(`Initializing bot`.magenta);

interface IMessage {
  name: string;
  telegramId: number;
}

async function registerUser(data: IMessage) {
  const res = await request
    .post('http://shkola-sync.ru:3000/create')
    .send(data); // sends a JSON post body
  console.log(`response is`, res.body);
  return res.body;
}

async function start() {
  const data = await new Promise<any>(resolve => bot.hears('start', resolve));
  console.log(`data received from msg`, data.message);
  // console.log(`date.date is ${data.date}`, moment.unix(data.date).format('DD.MM.YYYY HH:mm:ss'));
  const { id, username } = data.message.from;
  const result = await registerUser({ name: username, telegramId: id });
  await data.reply(`${result.status}: ${result.message}`);
}

async function getStats() {
  const data = await new Promise<any>(resolve => bot.hears('me', resolve));
  const { id, username } = data.message.from;
  const res = await request
    .post('http://shkola-sync.ru:3000/stats/get')
    .send({ name: username, period: { y: '2017', m: '10', d: '10' } });
  data.reply(
    `${res.body.status}> Stats for ${res.body.name}: ${res.body.data.length > 1 || 'No data for this period'}`);
  console.log(`response is`, res.body);
  return res.body;
}


bot.startPolling();

start();
getStats();


