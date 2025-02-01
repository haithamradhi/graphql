# Student Dashboard

A full-stack web application for displaying student progress, skills, and audit information.

## Features

- User authentication with session management
- Interactive dashboard with:
  - Basic user information
  - Progress overview
  - Skills radar chart
  - Audit distribution chart
  - Progress history table
  - Recent audits table
- Toast notification system
- Responsive design

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Chart.js
- Backend: Node.js, Express.js
- Session Management: express-session

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

1. Clone the repository:
```bash
git clone https://learn.reboot01.com/git/hradhi/graphql
cd graphql
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your configuration:
```env
PORT=3000
SESSION_SECRET=your-secret-key
NODE_ENV=development
```

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## Development

To run the application in development mode:
```bash
npm run dev
```

## Deployment

The application can be deployed to various platforms. Make sure to:
1. Set appropriate environment variables
2. Configure session storage for production
3. Enable HTTPS
4. Set secure cookie options

## License

[MIT](LICENSE)