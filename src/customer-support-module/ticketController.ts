import { Context } from 'hono';
import { TicketService } from './ticketService';

const ticketService = new TicketService();

export const createTicket = async (c: Context) => {
    try {
        const body = await c.req.json();
        const { user_id, subject, category, priority, description } = body;

        if (!user_id || !subject || !description) {
            return c.json({ error: "Missing required fields" }, 400);
        }

        const result = await ticketService.createTicket({ 
            user_id, subject, category, priority, description 
        });
        
        return c.json(result, 201);
    } catch (error: any) {
        console.error("Create Ticket Error:", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
};

export const getUserTickets = async (c: Context) => {
    try {
        const id = c.req.param('id');
        const tickets = await ticketService.getTicketsByUser(id);
        return c.json(tickets, 200);
    } catch (error) {
        return c.json({ error: "Failed to fetch tickets" }, 500);
    }
};

export const getAllTickets = async (c: Context) => {
    try {
        const tickets = await ticketService.getAllTickets();
        return c.json(tickets, 200);
    } catch (error) {
        return c.json({ error: "Failed to fetch all tickets" }, 500);
    }
};

export const getTicketById = async (c: Context) => {
    try {
        const id = parseInt(c.req.param('id'));
        const ticket = await ticketService.getTicketById(id);
        
        if (!ticket) return c.json({ message: "Ticket not found" }, 404);

        return c.json(ticket, 200);
    } catch (error) {
        return c.json({ error: "Failed to fetch ticket" }, 500);
    }
};

export const updateTicketStatus = async (c: Context) => {
    try {
        const id = parseInt(c.req.param('id'));
        const body = await c.req.json();
        const { status, admin_response } = body;

        if (!status) return c.json({ error: "Status is required" }, 400);

        const result = await ticketService.updateTicketStatus(id, { status, admin_response });
        return c.json(result, 200);
    } catch (error: any) {
        if (error.message === 'Ticket not found') {
            return c.json({ error: "Ticket not found" }, 404);
        }
        return c.json({ error: "Failed to update ticket" }, 500);
    }
};