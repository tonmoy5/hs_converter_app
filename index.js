const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/text_to_number', async (req, res) => {
  try {
    console.log(req.body);
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
    res.status(200).json({ wholeNumber });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.get("/", (req, res) => res.send("Express on Vercel"));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
