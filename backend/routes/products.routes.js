const express = require("express");
const router = express.Router();

let products = require("../data/products");
const movements = require("../data/movements");

function logMovement(entry, username) {
  movements.push({
    id: movements.length + 1,
    ...entry,
    modifiedBy: username || null,
    createdAt: new Date().toISOString()
  });
}

// LISTAR PRODUTOS
router.get("/", (req, res) => {
  res.json(products);
});

// ADICIONAR PRODUTO
router.post("/", (req, res) => {
  const { name, quantity } = req.body;

  const newProduct = {
    id: products.length + 1,
    name,
    quantity
  };

  products.push(newProduct);
  logMovement({
    type: "cadastro",
    productId: newProduct.id,
    productName: newProduct.name,
    quantityAfter: newProduct.quantity
  }, req.session && req.session.user && req.session.user.username);
  res.status(201).json(newProduct);
});

// ATUALIZAR PRODUTO (nome e/ou quantidade)
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, quantity } = req.body;

  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ message: "Produto não encontrado" });
  }

  const prevQty = product.quantity;
  const prevName = product.name;

  if (typeof name === "string" && name.trim()) product.name = name.trim();
  if (typeof quantity === "number" && quantity >= 0) product.quantity = quantity;

  if (prevName !== product.name) {
    logMovement({
      type: "alteração_nome",
      productId: product.id,
      productName: product.name,
      nameBefore: prevName,
      nameAfter: product.name
    }, req.session && req.session.user && req.session.user.username);
  }
  if (prevQty !== product.quantity) {
    logMovement({
      type: "alteração_quantidade",
      productId: product.id,
      productName: product.name,
      quantityBefore: prevQty,
      quantityAfter: product.quantity
    }, req.session && req.session.user && req.session.user.username);
  }

  res.json(product);
});

// REMOVER PRODUTO
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const product = products.find(p => p.id === id);
  if (product) {
    logMovement({
      type: "exclusão",
      productId: product.id,
      productName: product.name,
      quantityBefore: product.quantity
    }, req.session && req.session.user && req.session.user.username);
  }
  products = products.filter(p => p.id !== id);

  res.status(204).send();
});

module.exports = router;
