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