import 'colors';
import * as moment from 'moment';
import * as telegraf from 'telegraf';
import * as request from 'superagent';
import * as _ from 'lodash';

// constants
const config = require('../config.json');
const bot = new telegraf(config.tgToken);

console.log(`Initializing bot`.magenta);

interface IMessage {
  message: {
    from: {
      id?: number;
      username: string;
    };
    text: string;
  };
  reply: (val: string) => void;
}

interface IRegisterUser {
  name: string;
  telegramId: number;
}

interface IOutcome {
  name: string;
  sum: string;
  comment: string;
  date?: number;
}

interface IPeriod {
  from?: {
    d?: string,
    m?: string,
    y?: string,
  };
  to?: {
    d?: string,
    m?: string,
    y?: string,
  };
}

async function registerUser(data: IRegisterUser) {
  const res = await request
    .post(`${config.url}/create`)
    .send(data); // sends a JSON post body
  console.log(`response is`, res.body);
  return res.body;
}

async function start(data: IMessage) {
  console.log(`data received from msg`, data.message);
  const { id, username } = data.message.from;
  const result = await registerUser({ name: username, telegramId: id });
  await data.reply(`${result.status}: ${result.message}`);
}

async function writeOutcome(outcome: IOutcome) {
  const { sum, comment, name } = outcome;
  const res = await request
    .post(`${config.url}/stats/add`)
    .send({ name, sum, comment });
  console.log(`response at outcome is`, res.body);
  return res.body;
}

async function addOutcome(data: IMessage) {
  const { username: name } = data.message.from;
  const { text } = data.message;
  console.log(`data.message`, data.message.text);
  const splitted = text.split(' ');
  const sum = splitted[1]; // [0] is /add, [1] is an outcome amount
  const comment = _.drop(splitted, 2).join(' ');
  const outcome = {
    sum,
    comment,
    name,
  };
  const res = await writeOutcome(outcome);
  data.reply(`${res.status}: ${res.message}.`);
}

async function parseMessage(msg) {
  const splitted = msg.split(' ').splice(1);
  const period = {};
  const vals = ['d', 'm', 'y'];
  const parents = ['from', 'to'];
  console.log(`msg itself is`, msg, `splitted and shifted`.magenta, splitted);
  const formatYear = year => year.length === 2 ? `20${year}` : year;
  const isDateValid = date => moment(date, 'DD.MM.YYYY').isValid();
  if (splitted.length === 2
    && isDateValid(splitted[0]) && isDateValid(splitted[1])
  ) {
    const firstDate = splitted[0].split('.');
    const secondDate = splitted[1].split('.');
    if (firstDate.length !== 3 || secondDate.length !== 3) {
      console.log(`firstDate is`.red, firstDate, `secondDate is`.red, secondDate);
      return false;
    }
    for (let i = 0; i < 2; i = i + 1) {
      const date = splitted[i].split('.');
      console.log(`date[2]?`.red, date[2]);
      date[2] = formatYear(date[2]);
      console.log(`date is ${date}, i is ${i}`)
      console.log(`i is ${i}, adding period.${parents[i]} = ${date}`)
      for (let n = 0; n < 3; n = n + 1) {
        _.set(period, [parents[i], vals[n]], date[n]);
      }
    }
    console.log(`period`, period);
    return period;
  } else if (splitted.length === 1
    && moment(splitted[0], 'DD.MM.YYYY').isValid()
  ) {
    console.log(`splitted?`.magenta, splitted[0]);
    const firstDate = splitted[0].split('.');
    if (firstDate.length !== 3) {
      console.log(`firstDate is`.red, firstDate);
      return false;
    }
    const date = splitted[0].split('.');
    for (let n = 0; n < 3; n = n + 1) {
      if (n === 2) {
        date[n] = formatYear(date[n]);
        console.log(`date[n] is ${date[n]}`.red)
      }
      _.set(period, [parents[0], vals[n]], date[n]);
    }

    console.log(`period`, period);
    return period;
  }
  console.log(`no date provided.`)
  return false;
}

async function postRequest(path, data) {
  try {
    const result = await request
      .post(path)
      .send(data);
    return result;
  } catch (e) {
    console.log(`error`, e, !!e);
    return { status: 'ERROR', message: e };
  }
}

async function getStats(data: IMessage) {
  const { username } = data.message.from;
  const { text } = data.message;
  const period: IPeriod = await parseMessage(text);
  console.log(`period at getstats`, period);
  if (!period) {
    console.log(`not sending!`.red);
    data.reply(`ERROR:\nCannot parse data from message.`);
    return false;
  }
  const res = await postRequest(`${config.url}/stats/get`, { period, name: username });
  if (res.status === 'ERROR') {
    return data.reply(`${res.status}res.status: ${res.message}`);
  }
  const { status, data: stats, name, message } = res.body;
  console.log(`stats`.bgGreen, stats)
  if (status === 'ERROR') {
    return data.reply(`${status}:\n${message}`);
  }
  const ordered = _.orderBy(stats, ['date'], ['asc']);
  console.log(`ordered`, ordered);
  const stringified = ordered.map((i: IOutcome) => {
    return `${moment(i.date).format('DD.MM.YY HH:mm:ss')}: ${i.sum} RUB: ${i.comment}\n`;
  }).join('');
  const { to, from } = period;
  const dateType = {
    name: () => period.to ? 'period' : 'date',
    string: () => period.to ?
      `${from.d}.${from.m}.${from.y} - ${to.d}.${to.m}.${to.y}` :
      `${from.d}.${from.m}.${from.y}`,
  }
  data.reply(`${status}:\nStats by ${dateType.name()} ${dateType.string()} for ${name}:\n${!_.isEmpty(ordered) ? stringified : 'No data for this period'}`);
  console.log(`is empty?`, _.isEmpty(stats), `response is`, stats);
}


bot.startPolling();

bot.command('me', async data => await getStats(data));
bot.command('start', async data => await start(data));
bot.command('add', async data => await addOutcome(data));


