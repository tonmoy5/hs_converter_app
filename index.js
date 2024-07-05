require('dotenv').config();
const express = require('express');
const request = require('request-promise-native');
const NodeCache = require('node-cache');
const session = require('express-session');
let axios = require('axios');
const opn = require('open');
const app = express();
const qs = require('qs');

const PORT = process.env.PORT || 3000;
const BASE_URL = "https://dataconvertter-jrivzo2kh-tonmoy5s-projects.vercel.app"
// const BASE_URL = "http://localhost:3000"

const refreshTokenStore = {};
const accessTokenCache = new NodeCache({ deleteOnExpire: true });

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error('Missing CLIENT_ID or CLIENT_SECRET environment variable.')
}

//===========================================================================//
//  HUBSPOT APP CONFIGURATION
//
//  All the following values must match configuration settings in your app.
//  They will be used to build the OAuth URL, which users visit to begin
//  installing. If they don't match your app's configuration, users will
//  see an error page.

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Scopes for this app will default to `crm.objects.contacts.read`
// To request others, set the SCOPE environment variable instead
let SCOPES = ['crm.objects.contacts.read'];
if (process.env.SCOPE) {
  SCOPES = process.env.SCOPE.split(/ |, ?|%20/);
}

const REDIRECT_URI = `${BASE_URL}/oauth-callback`;

const getTokenHeaders = {
  'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
};
//===========================================================================//

app.use(session({
  secret: Math.random().toString(36).substring(2),
  resave: false,
  saveUninitialized: true
}));

// Step 1
const authUrl = 'https://app.hubspot.com/oauth/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + REDIRECT_URI + '&scope=' + SCOPES.join(' ');

app.get('/install', (req, res) => {
  console.log('=== Initiating OAuth 2.0 flow with HubSpot ===');
  console.log('===> Step 1: Redirecting user to your app\'s OAuth URL');
  res.redirect(authUrl);
  console.log('===> Step 2: User is being prompted for consent by HubSpot');
});

// Step 3
app.get('/oauth-callback', async (req, res) => {
  console.log('===> Step 3: Handling the request sent by the server');

  if (req.query.code) {
    console.log('       > Received an authorization token');
    console.log("auth code-->", req.query.code);

    const authCodeProof = {
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code: req.query.code
    };

    // Step 4
    console.log('===> Step 4: Exchanging authorization code for an access token and refresh token');
    const token = await exchangeForTokens(req.sessionID, authCodeProof, getTokenHeaders);
    if (token.message) {
      return res.redirect(`/error?msg=${token.message}`);
    }

    res.redirect(`/`);
  }
});

const exchangeForTokens = async (userId, exchangeProof, headers) => {
  try {
    const url_encoded_string = qs.stringify(exchangeProof);
    const responseBody = await axios.post('https://api.hubapi.com/oauth/v1/token', url_encoded_string, { headers });

    const tokens = responseBody.data;
    refreshTokenStore[userId] = tokens.refresh_token;
    accessTokenCache.set(userId, tokens.access_token, Math.round(tokens.expires_in * 0.75));

    console.log('       > Received an access token and refresh token');
    return tokens.access_token;
  } catch (e) {
    console.error(`      > Error exchanging ${exchangeProof.grant_type} for access token`);
    console.log(e.response);
    return e.response;
  }
};

const refreshAccessToken = async (userId) => {
  const refreshTokenProof = {
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    refresh_token: refreshTokenStore[userId]
  };
  return await exchangeForTokens(userId, refreshTokenProof, getTokenHeaders);
};

const getAccessToken = async (userId) => {
  if (!accessTokenCache.get(userId)) {
    console.log('Refreshing expired access token');
    await refreshAccessToken(userId);
  }
  return accessTokenCache.get(userId);
};

const isAuthorized = (userId) => {
  return refreshTokenStore[userId] ? true : false;
};

const getContact = async (accessToken) => {
  console.log('=== Retrieving a contact from HubSpot using the access token ===');
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
    const result = await axios.get('https://api.hubapi.com/contacts/v1/lists/all/contacts/all', { headers });
    return result.data.contacts[0];
  } catch (e) {
    console.error('  > Unable to retrieve contact');
    return JSON.parse(e.response);
  }
};

const getAccountInfo = async (accessToken) => {
  console.log('');
  console.log('=== Retrieving the accounts info ===');
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
    const result = await axios.get('https://api.hubapi.com/account-info/v3/details', { headers });
    return result.data;
  } catch (e) {
    console.error('  > Unable to retrieve account info');
    return JSON.parse(e.response.body);
  }
};

app.get('/', async (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.write(`<h2>HubSpot OAuth 2.0 Quickstart App</h2>`);
  if (isAuthorized(req.sessionID)) {
    const accessToken = await getAccessToken(req.sessionID);
    const contact = await getContact(accessToken);
    const accInfo = await getAccountInfo(accessToken);
    res.write(`<p>Account Info: ${JSON.stringify(accInfo)}</p>`);
    res.write(`<h4>Access token: ${accessToken}</h4>`);
    res.write(`<p>Contact name: ${contact.properties.firstname.value} ${contact.properties.lastname.value}</p>`);
  } else {
    res.write(`<a href="/install"><h3>Install the app</h3></a>`);
  }
  res.end();
});

app.get('/error', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.write(`<h4>Error: ${req.query.msg}</h4>`);
  res.end();
});

// Text to number conversion
app.post('/text_to_number', async (req, res) => {
  console.log(req)
  try {
    console.log(req.body.value);
    const number = parseFloat(req.body.value);
    res.status(200).json({
      "outputFields": {
        "numberOutput": number,
        "hs_execution_state": "SUCCESS"
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Convert number to string
app.post('/number_to_text', async (req, res) => {
  try {
    console.log(req.body);
    const text = req.body.value.toString();
    res.status(200).json({
      "outputFields": {
        "Converted_Text": text,
        "hs_execution_state": "SUCCESS"
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Convert floating number to whole number
app.post('/whole_number', async (req, res) => {
  try {
    console.log(req.body);
    const wholeNumber = Math.round(parseFloat(req.body.value));
    res.status(200).json({
      "outputFields": {
        "whole_number": wholeNumber,
        "hs_execution_state": "SUCCESS"
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
