const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/test', async (req, res) => {
  try {
    console.log(req.body);
    res.status(200).json(req.body);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.post('/convert', async (req, res) => {
  try {
    console.log(req.body);
    const number = parseFloat(req.body.value);
    res.status(200).json(number);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.post('/convert_multiple', async (req, res) => {
  try {
    const textObject = req.body;
    const numberObject = {};
    for (const key in textObject) {
      numberObject[key] = parseFloat(textObject[key]);
    }

    res.status(200).json(numberObject);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.get("/", (req, res) => res.send("Express on Vercel"));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
