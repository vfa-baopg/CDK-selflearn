const express = require('express');
const app = express();
const port = 8081;

app.get('/admin/health', (req, res) => {
  res.send('Admin is healthy');
});

app.listen(port, () => {
  console.log(`Admin running on port ${port}`);
});
