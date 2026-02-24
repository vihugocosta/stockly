const bcrypt = require("bcryptjs");

// Usuários (em produção use banco de dados)
// Senha padrão: admin
const users = [
  {
    username: "admin",
    passwordHash: bcrypt.hashSync("admin", 10)
  }
];

function findUser(username) {
  return users.find((u) => u.username === username);
}

function checkPassword(username, password) {
  const user = findUser(username);
  if (!user) return null;
  return bcrypt.compareSync(password, user.passwordHash) ? user : null;
}

function createUser(username, password) {
  const name = String(username || "").trim();
  if (!name) {
    throw new Error("Nome de usuário é obrigatório");
  }
  if (findUser(name)) {
    throw new Error("Usuário já existe");
  }
  if (!password || String(password).length < 4) {
    throw new Error("Senha deve ter ao menos 4 caracteres");
  }
  const passwordHash = bcrypt.hashSync(String(password), 10);
  const user = { username: name, passwordHash };
  users.push(user);
  return user;
}

module.exports = { findUser, checkPassword, createUser };
