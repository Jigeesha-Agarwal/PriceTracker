const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const [id] = await db('users').insert({
      email,
      password_hash,
      name: name || null,
      notify_via: JSON.stringify(['email']),
    });
    const user = await db('users').where({ id }).select('id', 'email', 'name').first();
    const token = jwt.sign({ userId: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
