const fs = require('fs');
const path = require('path');
const routes = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/routes.json'))) || {};

