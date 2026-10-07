const express = require('express');
const router = express.Router();
const prisma = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
