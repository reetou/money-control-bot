import { assert } from 'chai';
import {parseMessage, postRequest} from "../src/index";
import * as envalid from 'envalid'

require('dotenv').config();
const { str, url } = envalid;
const env = envalid.cleanEnv(process.env, {
	TELEGRAM_TOKEN: str(),
	API_URL: url(),
});

const { API_URL } = env;

describe('Server', async () => {
	let name = 'NonExistingUser';
	let period = {
		from: { d: '23', m: '11', y: '2017' }
	};
	const singleDateMsg = '/me 23.11.2017';
	const badSingleDateMsg = '/me 23.11';
	const badYearSingleDateMsg = '/me 23.11';
	const periodDateMsg = '/me 23.11.2017 26.11.2017';
	const expectedSingleDate = {
		from: { d: '23', m: '11', y: '2017' }
	};
	const expectedPeriodDate = {
		from: { d: '23', m: '11', y: '2017' },
		to: { d: '26', m: '11', y: '2017' }
	}

	it('should successfully make post request', async () => {
		const res = await postRequest(`${API_URL}/stats/get`, { period, name });
		assert.equal(res.status, '200');
	})

	it('should successfully parse message with single date', async () => {
		const result = await parseMessage(singleDateMsg);
		assert.deepEqual(result, expectedSingleDate, 'single date period from parseMessage');
	})

	it('should successfully parse message with period date', async () => {
		const result = await parseMessage(periodDateMsg);
		assert.deepEqual(result, expectedPeriodDate, 'period date from parseMessage');
	})

	it('should return false if message does not contain year', async () => {
		const result = await parseMessage(badSingleDateMsg);
		assert.isFalse(result, 'false from parseMessage');
	})

	it('should return false if message contains bad year', async () => {
		const result = await parseMessage(badYearSingleDateMsg)
		assert.isFalse(result, 'false from parseMessage')
	})

});