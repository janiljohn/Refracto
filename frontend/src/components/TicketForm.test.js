import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TicketForm from './TicketForm';
import { createTicket } from '../utils/api';

// Mock the API calls
jest.mock('../utils/api', () => ({
  createTicket: jest.fn(),
  updateTicket: jest.fn()
}));

describe('TicketForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('entities', JSON.stringify(['User', 'Order', 'Product']));
  });

  const fillTicketForm = async (title, intent, trigger, output) => {
    await userEvent.type(screen.getByLabelText(/title/i), title);
    await userEvent.type(screen.getByLabelText(/intent/i), intent);
    await userEvent.type(screen.getByLabelText(/trigger/i), trigger);
    await userEvent.type(screen.getByLabelText(/output/i), output);
  };

  it('should create multiple tickets successfully', async () => {
    const tickets = [
      {
        title: 'User Authentication',
        intent: 'Implement user login functionality',
        trigger: 'on CREATE of User',
        output: 'Create login endpoint'
      },
      {
        title: 'Order Processing',
        intent: 'Handle order creation',
        trigger: 'on CREATE of Order',
        output: 'Create order processing logic'
      }
    ];

    createTicket.mockImplementation((data) => Promise.resolve({ ...data, _id: Math.random().toString() }));

    for (const ticket of tickets) {
      render(<TicketForm mode="create" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
      
      await fillTicketForm(
        ticket.title,
        ticket.intent,
        ticket.trigger,
        ticket.output
      );

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(createTicket).toHaveBeenCalledWith(expect.objectContaining({
          title: ticket.title,
          intent: ticket.intent,
          trigger: ticket.trigger,
          output: ticket.output
        }));
      });
    }
  });

  it('should handle validation errors', async () => {
    render(<TicketForm mode="create" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    fireEvent.click(screen.getByText('Create'));
    
    expect(await screen.findByText('Please fill all required fields.')).toBeInTheDocument();
    expect(createTicket).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    createTicket.mockRejectedValueOnce({ response: { data: { error: 'API Error' } } });
    
    render(<TicketForm mode="create" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    await fillTicketForm(
      'Test Ticket',
      'Test Intent',
      'on CREATE of User',
      'Test Output'
    );

    fireEvent.click(screen.getByText('Create'));

    expect(await screen.findByText('API Error')).toBeInTheDocument();
  });
}); 