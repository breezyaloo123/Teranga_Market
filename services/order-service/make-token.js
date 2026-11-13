require('dotenv').config();
const jwt = require('jsonwebtoken');
const role = process.argv[2] || 'analyst';
const expiresIn = process.argv[3] || '60m';
console.log(jwt.sign({ sub: 'user-test', roles: [role] }, process.env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn }));