# RentEasy Backend

This is the backend for the RentEasy project, built with Node.js, Express, and MongoDB.

## Prerequisites

- Node.js installed
- MongoDB running locally or a MongoDB Atlas connection string

## Setup Instructions

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Create a `.env` file in the root directory (you can copy from `.env.example` if it exists) and add the following:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/renteasy
   ```
4. Start the development server using `node server.js` (or use `nodemon` if you have it installed).

## API Endpoints

- `GET /api/health` - Basic health check. Returns `{ "status": "ok" }`.
