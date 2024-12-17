const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { getRandomSentence } = require('./connection');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/random-sentence', async (req, res) => {
    try {
        const sentence = await getRandomSentence();
        if (sentence) {
            res.json({ sentence });
        } else {
            res.status(404).json({ error: 'No sentences found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch random sentence' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});