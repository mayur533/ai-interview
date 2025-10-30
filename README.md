# AI Interview Platform - Backend

This is the backend repository for the AI Interview Platform, a comprehensive recruitment management system.

## Features

- **Candidate Management**: Create, track, and manage candidates throughout the recruitment process
- **Job Management**: Post job openings with detailed requirements and descriptions
- **Interview Scheduling**: Schedule and manage interviews with automated slot booking
- **AI-Powered Evaluation**: Automated candidate evaluation using AI technology
- **Hiring Agency Management**: Manage multiple hiring agencies and recruiters
- **Dashboard & Analytics**: Comprehensive analytics with export capabilities (PDF/CSV)
- **Email Notifications**: Automated email notifications for various events
- **Role-Based Access Control**: Secure access control based on user roles

## Tech Stack

- **Python 3.13**
- **Django 5.1**
- **Django REST Framework**
- **PostgreSQL** (production)
- **SQLite** (development)

## Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

4. Run migrations:
```bash
python manage.py migrate
```

5. Create a superuser:
```bash
python manage.py createsuperuser
```

6. Run the development server:
```bash
python manage.py runserver
```

## API Documentation

The API endpoints are documented in `AI_Interviewer_API_Documentation.json` and can be imported into Postman using `AI_Interviewer_API_Collection.json`.

## Frontend

The frontend repository is separate and can be found at: [AI Interview Frontend](https://github.com/rahulwaghole14/aiinterviewfrontend)

## License

Proprietary - All rights reserved

## Support

For support, contact: mayurkhalate63@gmail.com

