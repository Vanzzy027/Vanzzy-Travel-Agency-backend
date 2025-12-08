import { Hono } from 'hono';
import { 
    createTicket, 
    getUserTickets, 
    getAllTickets, 
    getTicketById, 
    updateTicketStatus 
} from './ticketController';

const ticketRoute = new Hono();

// User Routes
ticketRoute.post('/', createTicket);
ticketRoute.get('/user/:id', getUserTickets);

// Admin Routes
ticketRoute.get('/', getAllTickets); 
ticketRoute.get('/:id', getTicketById);
ticketRoute.put('/:id', updateTicketStatus);

export default ticketRoute;