# CloudeNotes


**A Secure Cloud-Based Note Management System**

CloudNotes is a web application designed to help users create, organize, search, edit, and delete their personal notes through a simple and responsive interface. The project aims to provide secure user authentication and cloud-based storage so users can access their own notes while keeping them private from other accounts.

## 🚀 Features

- **User Registration:** Create a user account.
- **User Login and Logout:** Authenticate users and manage sessions.
- **Notes Management:** Create, view, edit, and delete notes.
- **Search Notes:** Find notes using keywords.
- **User-Specific Access:** Ensure each user can access only their own notes.
- **Responsive Interface:** Use the application across different screen sizes.
- **Cloud Deployment:** Deploy the application using AWS.

*Note: Authentication, persistent storage, and user-specific access depend on backend integration and testing.*

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, Flask |
| ORM | SQLAlchemy |
| Database | PostgreSQL |
| Authentication | Werkzeug password hashing, Flask sessions |
| Cloud Platform | Amazon Web Services (AWS) |
| Version Control | Git and GitHub |

## 📁 Project Structure

```text
CloudNotes/
├── templates/
│   ├── login.html
│   ├── register.html
│   └── dashboard.html
├── static/
│   ├── style.css
│   └── script.js
├── app.py
├── models.py
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

The backend and configuration files will be added as the team develops and integrates the application.

## ⚙️ Getting Started

### Frontend Preview

1. Clone or download the repository.
2. Open the project folder in Visual Studio Code.
3. Install the **Live Server** extension.
4. Open `templates/login.html`.
5. Right-click and select **Open with Live Server**.

The current frontend preview uses demo login behavior and sample notes.

### Backend Setup

Once the backend files are available:

1. Install Python and PostgreSQL.
2. Create and activate a Python virtual environment.
3. Install dependencies from `requirements.txt`.
4. Configure the required environment variables using `.env.example`.
5. Initialize the database.
6. Start the Flask application using the command specified by the backend implementation.

Backend setup commands and database configuration will be documented once finalized.

## 🔐 Security

The intended implementation includes:

- Secure password hashing.
- Session-based authentication.
- User-specific authorization for note operations.
- Environment variables for sensitive configuration.
- Input validation and protection against unauthorized access.
- HTTPS for production deployment.

These protections must be implemented and verified in the integrated application.

## ☁️ Deployment

CloudNotes is planned for deployment on AWS, with the Flask application and PostgreSQL database hosted in an appropriate cloud environment. The specific AWS services and deployment configuration will be documented once finalized.

## 👥 Team Collaboration

This project is developed collaboratively, with responsibilities divided across:

- **Frontend Development:** User interface, responsive styling, and JavaScript interactions.
- **Backend and Database:** Flask APIs, authentication, and database operations.
- **Cloud and Security:** Deployment, configuration, security, and integration support.

## 📌 Project Status

**In Development** — The frontend demo is available. Backend integration, database persistence, account isolation, and cloud deployment remain subject to implementation and testing.


