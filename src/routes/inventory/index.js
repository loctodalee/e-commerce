const express = require("express");
const InventoryController = require("../../controllers/inventory.controller");
const { asyncHandler } = require("../../helper/asyncHandler");
const { authentication } = require("../../auth/authUtils");
const router = express.Router();

router.use(authentication);

router.post("", asyncHandler(InventoryController.addStockToInventory));

module.exports = router;
