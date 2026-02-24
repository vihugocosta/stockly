const express = require("express");
const router = express.Router();
const movements = require("../data/movements");

// LISTAR MOVIMENTAÇÕES (mais recentes primeiro)
router.get("/", (req, res) => {
  const list = [...movements].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(list);
});

module.exports = router;
