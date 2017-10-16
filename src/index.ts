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
  // console.log(`date.date is ${data.date}`, moment.unix(data.date).format('DD.MM.YYYY HH:mm:ss'));
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
  if (
    splitted.length === 2 &&
    moment(splitted[0], 'DD.MM.YYYY').isValid() &&
    moment(splitted[1], 'DD.MM.YYYY').isValid()
  ) {
    for (let i = 0; i < 2; i = i + 1) {
      const date = splitted[i].split('.');
      if (date[2].length === 2) {
        date[2] = `20${date[2]}`;
      }
      console.log(`date is ${date}, i is ${i}`)
      console.log(`i is ${i}, adding period.${parents[i]} = ${date}`)
      for (let n = 0; n < 3; n = n + 1) {
        _.set(period, [parents[i], vals[n]], date[n]);
      }
    }
    console.log(`period`, period);
    return period;
  } else if (splitted.length === 1 && moment.isDate(splitted[0])) {
    for (let n = 0; n < 3; n = n + 1) {
      const date = splitted[n].split('.');
      _.set(period, [parents[0], vals[n]], date[n]);
    }

    console.log(`period`, period);
    return period;
  }
  console.log(`no date provided.`)
  return false;
}

async function getStats(data: IMessage) {
  const { username } = data.message.from;
  const { text } = data.message;
  const period: IPeriod = await parseMessage(text);
  console.log(`period at getstats`, period);
  if (!period) {
    console.log(`not sending!`.red);
    return false;
  } else {
    console.log(`sending, period is`, period);
  }
  const res = await request
    .post(`${config.url}/stats/get`)
    .send({
      period,
      name: username,
    });
  const { status, data: stats, name } = res.body;
  const mapped = [];
  _.forEach(stats, (year) => {
    _.forEach(year, (month) => {
      _.forEach(month, (day) => {
        return mapped.push(_.values(day));
      });
    });
  });
  const flattened = _.flatten(mapped);
  // console.log(`flattened`, flattened);
  const ordered = _.orderBy(flattened, ['date'], ['asc']);
  // console.log(`ordered`, ordered);
  const stringified = ordered.map((i: IOutcome) => {
    return `${moment(i.date).format('DD.MM.YY HH:mm:ss')}: ${i.sum} RUB: ${i.comment}\n`;
  }).join('');
  // console.log(`stringified stats`, mapped);
  data.reply(`${status}> Stats by TODAY for ${name}:\n${!_.isEmpty(ordered) ? stringified : 'No data for this period'}`);
  console.log(`is empty?`, _.isEmpty(stats), `response is`, stats);
}


bot.startPolling();

bot.command('me', async data => await getStats(data));
bot.command('start', async data => await start(data));
bot.command('add', async data => await addOutcome(data));


