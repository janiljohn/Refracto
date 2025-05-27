import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const getTickets = async () => {
  const res = await axios.get(`${API_BASE}/tickets`);
  return res.data;
};

export const createTicket = async (data) => {
  const res = await axios.post(`${API_BASE}/tickets`, data);
  return res.data;
};

export const updateTicket = async (id, data) => {
  const res = await axios.put(`${API_BASE}/tickets/${id}`, data);
  return res.data;
};

export const deleteTicket = async (id) => {
  const res = await axios.delete(`${API_BASE}/tickets/${id}`);
  return res.data;
};

export const refineTicket = async (id, prompt) => {
  const res = await fetch(`${API_BASE}/tickets/${id}/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: prompt
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to refine code');
  }
  return res.json();
};

export const approveTicket = async (id) => {
  const res = await fetch(`${API_BASE}/tickets/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to approve and apply changes');
  }
  return res.json();
};

export const terminateTicket = async (id) => {
  const res = await fetch(`${API_BASE}/tickets/${id}/terminate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to terminate ticket');
  }
  return res.json();
};

export const getTicket = async (id) => {
  const res = await axios.get(`${API_BASE}/tickets/${id}`);
  return res.data;
}; 