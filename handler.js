'use strict';
const axios = require('axios');
const uuid = require('uuid');
const qs = require('qs');
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const crypto = require('crypto');
const timingSafeCompare = require('tsscmp');
const modalView = require('./views/create_record');

const verifyRequest = (request) => new Promise((resolve, reject) => {
  try {
    const req = request;
    const signature = req.headers['X-Slack-Signature'];
    const timestamp = req.headers['X-Slack-Request-Timestamp'];
    const hmac = crypto.createHmac('sha256', process.env.slack_signing_secret);
    const [version, hash] = signature.split('=');

    const fiveMinutesAgo = ~~(Date.now() / 1000) - (60 * 5);
    if (timestamp < fiveMinutesAgo) {
      return resolve(false);
    }

    hmac.update(`${version}:${timestamp}:${req.body}`);

    const match = timingSafeCompare(hmac.digest('hex'), hash);

    return resolve(match);
  } catch (err) {
    return reject(err);
  }
});

const scb = (body) => {
  return {
    statusCode: 200,
    body: JSON.stringify(body || {})
  };
};
const ecb = (code) => {
  return {
    statusCode: code,
  };
};

const fakeAuth = async (event) => {
  try {
    const data = {
      code: event.queryStringParameters.code,
      client_id: process.env.client_id,
      client_secret: process.env.client_secret,
      redirect_uri: 'https://r825kddegc.execute-api.us-east-1.amazonaws.com/dev/slack'
    };
    const result = await axios.post('https://slack.com/api/oauth.v2.access', qs.stringify(data));

    if (!result || !result.data || !result.data.access_token) {
      return ecb(403);
    }
    return {
      statusCode: 302,
      headers: {
        Location: 'https://slack.com/app_redirect?app=A01CN83B9B4'
      }
    };
  } catch (err) {
    return ecb(500);
  }
};

const installApp = async () => {
  return {
    statusCode: 302,
    headers: {
      Location: 'https://slack.com/oauth/authorize',
      client_id: '1430480045587.1430275383378'
    }
  };
};

const sendModal = (payload) => {
  const viewData = {
    token: process.env.slackToken,
    trigger_id: payload.trigger_id,
    view: JSON.stringify(modalView)
  };

  return axios.post('https://slack.com/api/views.open', qs.stringify(viewData));
};

const saveToDynamo = (values) => new Promise((resolve, reject) => {
  const first_name = values && values.first_name && values.first_name.first_name_value && values.first_name.first_name_value.value;
  const last_name = values && values.last_name && values.last_name.last_name_value && values.last_name.last_name_value.value;

  const createdAt = new Date().getTime();
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      id: uuid.v1(),
      createdAt,
      first_name,
      last_name,
    },
  };

  dynamoDb.put(params, (error) => {
    if (error) {
      console.error('put to db err :', error);
      return reject();
    }
    return resolve();
  });
});

const slack = async (event) => {
  try {
    const isMyApp = await verifyRequest(event);

    if (!isMyApp) {
      return ecb(403);
    }
    const body = qs.parse(event.body);
    const payload = JSON.parse(body.payload);
    const { type, view } = payload;

    if (type === 'shortcut') {
      await sendModal(payload);
      return scb();
    } else if (type === 'view_submission') {
      const values = view.state.values;
      await saveToDynamo(values);
      return scb();
    }
  } catch (err) {
    return ecb(500);
  }
};

module.exports = {
  fakeAuth,
  installApp,
  slack
};
