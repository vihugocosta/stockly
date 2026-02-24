const express = require("express");
const router = express.Router();
const { checkPassword, createUser } = require("../data/users");

// Verifica se o usuário está logado (retorna dados ou 401)
router.get("/me", (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ user: req.session.user });
  }
  return res.status(401).json({ message: "Não autenticado" });
});

// Login
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: "Usuário e senha são obrigatórios." });
  }
  const user = checkPassword(username.trim(), password);
  if (!user) {
    return res.status(401).json({ message: "Usuário ou senha inválidos." });
  }
  req.session.user = { username: user.username };
  res.json({ user: req.session.user });
});

// Registro de novo usuário
router.post("/register", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: "Usuário e senha são obrigatórios." });
  }
  try {
    const user = createUser(username.trim(), password);
    req.session.user = { username: user.username };
    return res.status(201).json({ user: req.session.user });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Erro ao criar usuário." });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Erro ao sair." });
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

module.exports = router;
