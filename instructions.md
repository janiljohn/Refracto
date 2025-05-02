The project is called Refracto.

---

## 🛠️ Ticketing System UI Specification

### 📌 Overview
This is a MERN stack-based UI for a code generation platform where users create and manage tickets representing code implementation scenarios. Each ticket, once created, triggers a backend AI-powered SDK (`goose`) to generate code and test cases based on the ticket description. There is no authentication. Start with a landing page that has the project name and a text box that requests the github url for the project to work on. Once submitted redirect to the tickets page.

---

### 🧱 Components & Layout

#### 🔲 Sidebar (Left Panel)
- **Ticket List**:
  - Displays a list of user-created tickets.
  - Each ticket box includes:
    - Ticket title (e.g., *Ticket 1*)
    - Ticket description (preview or snippet)
    - Status tag (color-coded: blue, yellow, green, red)
  - Clicking a ticket loads its code details in the right panel.
- **Create New Scenario Button**:
  - A `+ Create New Scenario` button at the bottom.
  - Opens a modal or inline form to enter a new ticket title and description.

#### 💻 Main Window (Right Panel)
- **When a ticket is selected**:
  - **Code Implementation Section**:
    - Shows the generated code (editable).
    - Comes from the backend Goose SDK response.
  - **Test Case Implementation Section**:
    - Shows test code related to the scenario (also editable).
- **Approve & Apply Button**:
  - Button to approve the code and push changes to the GitHub repo (via backend API).
- **Status Indicator**:
  - Ticket tag on left should update based on progress:
    - `🟦 Blue`: New ticket
    - `🟨 Yellow`: Code generation in progress
    - `🟩 Green`: Code generation completed
    - `🟥 Red`: Code generation failed

#### 💬 Chat Prompt Panel (Bottom of Right Panel)
- Chat-style input to prompt further refinements (e.g., “refactor this method”).
- Backend sends this prompt and ticket ID to the Goose SDK for refined generation.

#### 🔧 Ticket Management
- **Edit Ticket**:
  - Allow user to update existing ticket's title or description.
- **Delete Ticket**:
  - Option to remove ticket from the list and database.
- **Tags**:
  - Colored dots or badges reflecting status (hooked to backend state).

---

### 🔁 Backend API Integration (Placeholder)
- **POST `/api/tickets`**: Create new ticket
- **PUT `/api/tickets/:id`**: Update ticket
- **DELETE `/api/tickets/:id`**: Delete ticket
- **GET `/api/tickets/:id/code`**: Fetch generated code for ticket
- **POST `/api/tickets/:id/generate`**: Triggers Goose SDK for code generation
- **POST `/api/tickets/:id/refine`**: Sends refinement prompt to Goose SDK
- **POST `/api/tickets/:id/apply`**: Approve and push changes to GitHub

---

### 🧑‍💻 Tech Details
- **Frontend**:
  - React (with functional components and hooks)
  - Optional: TailwindCSS or Material UI
- **Backend**:
  - Node.js with Express
  - MongoDB for ticket persistence
  - Goose SDK integration
  - GitHub API (for applying changes)
- **Authentication (Optional)**:
  - Simple user login to associate tickets

---

### ✅ Acceptance Criteria
- User can create, update, and delete tickets.
- Clicking a ticket loads editable code and test case.
- Status tags accurately reflect backend progress.
- User can approve code to apply to GitHub repo.
- Refinement chat prompt sends data to backend and updates UI on success.

---
