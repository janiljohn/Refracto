const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

router.get('/', ticketController.getTickets);
router.get('/:id', ticketController.getTicket);
router.post('/', ticketController.createTicket);
router.put('/:id', ticketController.updateTicket);
router.delete('/:id', ticketController.deleteTicket);
router.post('/:id/refine', ticketController.refineTicket);
router.post('/:id/approve', ticketController.approveTicket);
router.post('/:id/terminate', ticketController.terminateTicket);

module.exports = router; 