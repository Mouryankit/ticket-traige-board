import express from 'express';
import { Ticket, PRIORITIES, STATUSES } from '../models/Ticket.js';
import { applyResolvedAt, decorateTicket, validateStatusTransition } from '../utils/ticketRules.js';

const router = express.Router();

function badRequest(message, errors) {
  const error = new Error(message);
  error.statusCode = 400;
  if (errors) {
    error.errors = errors;
  }
  return error;
}

function validateFilterEnums(query) {
  if (query.status && !STATUSES.includes(query.status)) {
    throw badRequest('Invalid status filter. Use one of: open, in_progress, resolved, closed');
  }

  if (query.priority && !PRIORITIES.includes(query.priority)) {
    throw badRequest('Invalid priority filter. Use one of: low, medium, high, urgent');
  }

  if (query.breached && query.breached !== 'true' && query.breached !== 'false') {
    throw badRequest('Invalid breached filter. Use breached=true or breached=false');
  }
}

router.post('/', async (req, res, next) => {
  try {
    const allowed = ['subject', 'description', 'customerEmail', 'priority'];
    const payload = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key))
    );
    const ticket = await Ticket.create(payload);

    res.status(201).json(decorateTicket(ticket));
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    validateFilterEnums(req.query);

    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;

    const tickets = await Ticket.find(query).sort({ createdAt: -1 });
    let decorated = tickets.map((ticket) => decorateTicket(ticket));

    if (req.query.breached === 'true') {
      decorated = decorated.filter((ticket) => ticket.slaBreached);
    } else if (req.query.breached === 'false') {
      decorated = decorated.filter((ticket) => !ticket.slaBreached);
    }

    res.json(decorated);
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const tickets = await Ticket.find({});
    const decorated = tickets.map((ticket) => decorateTicket(ticket));

    const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));
    const byPriority = Object.fromEntries(PRIORITIES.map((priority) => [priority, 0]));

    decorated.forEach((ticket) => {
      byStatus[ticket.status] += 1;
      byPriority[ticket.priority] += 1;
    });

    res.json({
      byStatus,
      byPriority,
      currentlyBreached: decorated.filter(
        (ticket) => ticket.slaBreached && !['resolved', 'closed'].includes(ticket.status)
      ).length
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const allowedFields = ['subject', 'description', 'customerEmail', 'priority', 'status'];
    Object.keys(req.body).forEach((key) => {
      if (!allowedFields.includes(key)) {
        throw badRequest(`Field "${key}" cannot be updated`);
      }
    });

    if (req.body.status !== undefined) {
      if (!STATUSES.includes(req.body.status)) {
        throw badRequest('Status must be one of: open, in_progress, resolved, closed');
      }

      const transition = validateStatusTransition(ticket.status, req.body.status);
      if (!transition.valid) {
        throw badRequest(transition.message);
      }

      applyResolvedAt(ticket, req.body.status);
    }

    ['subject', 'description', 'customerEmail', 'priority'].forEach((field) => {
      if (req.body[field] !== undefined) {
        ticket[field] = req.body[field];
      }
    });

    await ticket.save();
    res.json(decorateTicket(ticket));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
