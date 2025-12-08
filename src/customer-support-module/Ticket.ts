export interface Ticket {
    ticket_id: number;
    user_id: string;
    subject: string;
    category: string;
    priority: 'Low' | 'Medium' | 'High';
    description: string;
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
    admin_response?: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateTicketDTO {
    user_id: string;
    subject: string;
    category: string;
    priority: string;
    description: string;
}

export interface UpdateTicketDTO {
    status: string;
    admin_response: string;
}