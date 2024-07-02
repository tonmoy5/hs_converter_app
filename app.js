const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/convert', async (req, res) => {
  try {
    const textObject = req.body; // Assuming the object is sent in the body of the request

    // Convert text to numbers (this is a dummy example, adjust as needed)
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

app.get("/", async (req, res) => {
  res.status(200).send('OK');
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
