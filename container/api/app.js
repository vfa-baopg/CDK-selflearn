const express = require('express');
const app = express();
const port = 3000;

app.get('/api/health', (req, res) => {
  res.send('API is healthy');
});

app.listen(port, () => {
  console.log(`API running on port ${port}`);
});
