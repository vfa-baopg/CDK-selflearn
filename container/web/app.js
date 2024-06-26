const express = require('express');
const app = express();
const port = 80;

app.get('/web/health', (req, res) => {
  res.send('Web is healthy');
});

app.listen(port, () => {
  console.log(`Web running on port ${port}`);
});
