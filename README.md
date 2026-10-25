# MicroEscrow

MicroEscrow is a web application prototype for coordinating small pledges toward college events and campus projects. Students can browse campaigns and submit pledges; organizers can manage campaigns and mark them as disbursed or refunded.

The project includes a role-based interface, a Node.js and Express API, and optional MySQL persistence. It is intended for demonstration and development, not for processing real payments or holding funds.

## Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Demo accounts](#demo-accounts)
- [API overview](#api-overview)
- [Project structure](#project-structure)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)

## Features

- Student and organizer roles with separate dashboard views
- Campaign listings with pledge totals, backer counts, and deadlines
- Pledge tiers and custom pledge amounts
- A generated vault receipt ID for each pledge
- Campaign management actions, including target updates, disbursement, and refunds
- MySQL persistence, with an in-memory demo store when MySQL is unavailable
- A standalone login page and a main application page

## Screenshots

| Student dashboard | Login |
| --- | --- |
| ![MicroEscrow student dashboard](screenshots/dashboard.jpg) | ![MicroEscrow login page](screenshots/login.jpg) |

## Technology

- **Backend:** Node.js, Express 5
- **Database:** MySQL with an in-memory fallback for demos
- **Frontend:** HTML, CSS, and vanilla JavaScript
- **CSS framework:** Tailwind CSS via CDN

## Getting started

### Prerequisites

- Node.js 18 or later
- npm
- MySQL 8 or later (optional)

### 1. Clone the repository

```bash
git clone https://github.com/manthansharma6767/MicroEscrow.git
cd MicroEscrow
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the environment

Copy `.env.example` to `.env`. In PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

To use MySQL, update `.env` with a MySQL account that can create the configured database and tables:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=microescrow
```

When MySQL is unavailable or the connection fails, the server starts with seeded in-memory demo data instead. Changes made in this mode are temporary and are lost when the server restarts.

### 4. Start the application

```bash
npm start
```

Open [http://localhost:5000](http://localhost:5000) for the main application or [http://localhost:5000/login.html](http://localhost:5000/login.html) for the standalone login page. The API health endpoint is [http://localhost:5000/api/health](http://localhost:5000/api/health).

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@campus.edu` | `student123` |
| Student | `priya@campus.edu` | `student123` |
| Organizer | `organizer@campus.edu` | `organizer123` |

These accounts and their passwords are for local demonstration only.

## API overview

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Return API health status |
| `POST` | `/auth/login` | Sign in |
| `POST` | `/auth/register` | Register an account |
| `GET` | `/auth/me/:id` | Get a user profile |
| `GET` | `/auth/my-pledges/:userId` | Get a student's pledge history |
| `GET` | `/campaigns` | List campaigns |
| `GET` | `/campaigns/:id` | Get a campaign |
| `POST` | `/campaigns` | Create a campaign |
| `PATCH` | `/campaigns/:id/threshold` | Update a campaign target |
| `POST` | `/campaigns/:id/disburse` | Mark a campaign as disbursed |
| `POST` | `/campaigns/:id/refund` | Mark a campaign as refunded |
| `DELETE` | `/campaigns/:id` | Delete a campaign |
| `POST` | `/campaigns/reset-demo` | Reset demo campaign data |
| `GET` | `/pledges` | List pledges |
| `GET` | `/pledges/campaign/:campaignId` | List pledges for a campaign |
| `POST` | `/pledges` | Create a pledge record |

## Project structure

```text
MicroEscrow/
├── backend/
│   ├── api/              # Express route definitions
│   ├── controllers/      # Request handlers and application logic
│   ├── database/         # MySQL connection, fallback store, and schema
│   └── app.js            # Server setup and startup
├── frontend/
│   ├── components/       # Authentication and dashboard views
│   ├── css/              # Application styles
│   └── js/               # API client and frontend behavior
├── screenshots/
├── index.html            # Main application
├── login.html            # Standalone login page
├── .env.example
└── package.json
```

## Limitations

MicroEscrow is a prototype. Pledge submission creates an application record; it does not initiate or verify a UPI payment. Vault receipt IDs are not proof of funds held in escrow. Disbursement and refund actions update campaign state in the application and do not transfer or return money. Do not use this project to collect real payment details or manage real funds.

## Contributing

Contributions are welcome. Open an issue to discuss a significant change, or submit a pull request with a concise description of the change and any relevant testing.

## License

This project is licensed under the [ISC License](LICENSE).
