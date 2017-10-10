import express from 'express';
import 'colors';
import moment from 'moment';
import * as _ from 'lodash';
import * as redis from 'redis';
import * as bodyParser from 'body-parser';
import tgBot from 'node-telegram-bot-api';

// constants
const http = require('http');
const app = express();
const config = require('../config.json');
const bot = new tgBot(config.tgToken, { polling: true });

console.log(`Initializing bot`.magenta);

interface IMessage {
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
    language_code: string;
  };
  chat: {
    id: number;
    first_name: string;
    username: string;
    type: string;
  };
  date: number;
  text: string;
}

async function registerUser(data: IMessage) {
  
}

async function start() {
  const data = await new Promise<IMessage>(resolve => bot.onText(/start/, resolve));
  console.log(`data received from msg`, data);
  console.log(`date.date is ${data.date}`, moment.unix(data.date).format('DD.MM.YYYY HH:mm:ss'));
  await registerUser(data);
}

start();


