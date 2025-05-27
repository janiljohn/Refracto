const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const timeout = require('connect-timeout')

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// app.setTimeout(); // Set a default timeout of 2 minutes for all requests
app.use(timeout('600000s'))
// Connect to MongoDB
connectDB();

// Routes
app.get('/', (req, res) => {
    res.send('API is running...');
});
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));

// EC2
// app.use('/tickets', require('./routes/ticketRoutes'));
// app.use('/projects', require('./routes/projectRoutes'));

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 