const express = require('express');
const router = express.Router();
const amrController = require('../../../controllers/amr.controller');

router.post('/generate-path', amrController.generatePath.bind(amrController));

module.exports = router;
