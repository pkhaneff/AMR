const express = require('express');
const router = express.Router();
const amrController = require('../../../controllers/amr.controller');
const amrDataController = require('../../../controllers/amrData.controller');
const nodeBlockController = require('../../../controllers/nodeBlock.controller');
const cargoController = require('../../../controllers/cargo.controller');
const uturnController = require('../../../controllers/uturn.controller');

router.post('/generate-path', amrController.generatePath.bind(amrController));
router.get('/data/:amr_id', amrDataController.getAMRData.bind(amrDataController));
router.get('/data', amrDataController.getAllAMRData.bind(amrDataController));

router.get('/blocked-nodes', nodeBlockController.getBlockedNodes.bind(nodeBlockController));
router.post('/block-node', nodeBlockController.blockNode.bind(nodeBlockController));
router.post('/unblock-node', nodeBlockController.unblockNode.bind(nodeBlockController));
router.delete('/:amrId/blocked-nodes', nodeBlockController.clearBlockedNodesByAMR.bind(nodeBlockController));

router.get('/:amrId/cargo-status', cargoController.getCargoStatus.bind(cargoController));
router.post('/:amrId/cargo-status', cargoController.setCargoStatus.bind(cargoController));

router.post('/:amrId/uturn', uturnController.performUTurn.bind(uturnController));
router.post('/:amrId/can-uturn', uturnController.canUTurn.bind(uturnController));

module.exports = router;
