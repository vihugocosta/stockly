// Importa o Express
const express = require("express");
const cors = require("cors");
const session = require("express-session");

// Importa rotas e middleware
const productRoutes = require("./routes/products.routes.js");
const movementRoutes = require("./routes/movements.routes.js");
const authRoutes = require("./routes/auth.routes.js");
const { requireAuth } = require("./middleware/auth.js");

const app = express();

// CORS (permite credenciais para cookie de sessão)
app.use(cors({ origin: true, credentials: true }));

// Sessão (deve vir antes das rotas que usam req.session)
app.use(
  session({
    secret: "stockly-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
  })
);

app.use(express.json());

// Servir frontend (HTML, CSS, JS) da pasta public
app.use(express.static("public"));

// Rotas de autenticação (públicas)
app.use("/api/auth", authRoutes);

// Rotas protegidas (exigem login)
app.use("/products", requireAuth, productRoutes);
app.use("/movements", requireAuth, movementRoutes);

// Porta do servidor
const PORT = 3001;

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
