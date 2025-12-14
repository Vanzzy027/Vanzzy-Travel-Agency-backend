import mssql from 'mssql';
import { getRequest } from '../db/dbconfig.js'; // Use your existing helper
export class TicketService {
    // 1. Create a new ticket (User)
    async createTicket(ticketData) {
        // Use getRequest() to get a connection from your global pool
        const request = getRequest();
        await request
            .input('user_id', mssql.UniqueIdentifier, ticketData.user_id)
            .input('subject', mssql.NVarChar, ticketData.subject)
            .input('category', mssql.NVarChar, ticketData.category)
            .input('priority', mssql.NVarChar, ticketData.priority)
            .input('description', mssql.NVarChar, ticketData.description)
            .query(`
                INSERT INTO CustomerSupportTickets (user_id, subject, category, priority, description, status)
                VALUES (@user_id, @subject, @category, @priority, @description, 'Open')
            `);
        return { message: "Ticket created successfully" };
    }
    // 2. Get tickets for a specific user
    async getTicketsByUser(userId) {
        const request = getRequest();
        const result = await request
            .input('user_id', mssql.UniqueIdentifier, userId)
            .query(`
                SELECT * FROM CustomerSupportTickets 
                WHERE user_id = @user_id 
                ORDER BY created_at DESC
            `);
        return result.recordset;
    }
    // 3. Get ALL tickets (Admin)
    async getAllTickets() {
        const request = getRequest();
        // 🔴 CHANGED: u.full_name -> CONCAT(u.first_name, ' ', u.last_name) as full_name
        // 🔴 CHANGED: Added LEFT JOIN (safer if a user was deleted)
        const result = await request.query(`
            SELECT 
                t.*, 
                u.email, 
                CONCAT(u.first_name, ' ', u.last_name) as full_name 
            FROM CustomerSupportTickets t
            LEFT JOIN Users u ON t.user_id = u.user_id
            ORDER BY 
                CASE WHEN t.status = 'Open' THEN 1 ELSE 2 END, 
                t.created_at DESC
        `);
        return result.recordset;
    }
    // 4. Get Single Ticket
    async getTicketById(ticketId) {
        const request = getRequest();
        const result = await request
            .input('ticket_id', mssql.Int, ticketId)
            .query(`SELECT * FROM CustomerSupportTickets WHERE ticket_id = @ticket_id`);
        return result.recordset[0];
    }
    // 5. Update Ticket Status (Admin)
    async updateTicketStatus(ticketId, updateData) {
        const request = getRequest();
        // Check if ticket exists
        const check = await request
            .input('check_id', mssql.Int, ticketId)
            .query('SELECT ticket_id FROM CustomerSupportTickets WHERE ticket_id = @check_id');
        if (check.recordset.length === 0) {
            throw new Error('Ticket not found');
        }
        // We need a fresh request for the second query to avoid parameter conflicts
        const updateRequest = getRequest();
        await updateRequest
            .input('ticket_id', mssql.Int, ticketId)
            .input('status', mssql.NVarChar, updateData.status)
            .input('admin_response', mssql.NVarChar, updateData.admin_response)
            .query(`
                UPDATE CustomerSupportTickets 
                SET status = @status, 
                    admin_response = @admin_response, 
                    updated_at = GETDATE()
                WHERE ticket_id = @ticket_id
            `);
        return { message: "Ticket updated successfully" };
    }
}
