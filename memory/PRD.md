# EdOS - School Management Platform

## Product Requirements Document

### Overview
EdOS is a comprehensive School Management SaaS Platform designed to streamline educational institution operations. This MVP implementation covers Phase 1 (Foundation) and Phase 2 (Core Academic) of the full platform.

### Implemented Features

#### Phase 1: Foundation
- **School Registration & Setup**
  - New school registration with admin account creation
  - School information management (name, address, contact details)
  - Academic calendar setup (academic years, terms, holidays)
  - School settings and branding customization
  - Setup completion workflow

- **User Authentication (JWT-based)**
  - Email/password login
  - JWT access and refresh tokens
  - Token-based session management
  - Secure password hashing with bcrypt

- **Role-Based Access Control (RBAC)**
  - User types: Super Admin, School Admin, Principal, Teacher, Parent, Student, Finance Officer, Staff
  - Permission-based route protection
  - User type-specific dashboards and navigation

- **User Management**
  - Create, view, update, deactivate users
  - User invitation system with email tokens
  - Bulk user import via CSV
  - User filtering and search
  - Role assignment

#### Phase 2: Core Academic
- **Student Information Management**
  - Student profiles with comprehensive data
  - Enrollment number generation
  - Class and section assignment
  - Parent-student linking
  - Medical information tracking
  - Emergency contacts
  - Student search and filtering
  - Bulk student import

- **Class & Section Management**
  - Class creation with grade levels
  - Section creation with teacher assignment
  - Room allocation
  - Capacity tracking
  - Student enrollment

- **Subject Management**
  - Subject creation with codes
  - Credit assignment
  - Elective flag
  - Subject-class-teacher assignment
  - Periods per week configuration

- **Attendance System**
  - Daily attendance marking
  - Bulk attendance for classes
  - Attendance status types (Present, Absent, Late, Excused, Medical)
  - Attendance summary and statistics
  - Leave request management
  - Attendance history tracking

- **Gradebook**
  - Assignment creation (Homework, Quiz, Test, Exam, Project, etc.)
  - Due date management
  - Late submission configuration
  - Grade entry and calculation
  - Letter grade mapping
  - Grade publishing
  - Bulk grading

### Technical Architecture

#### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py              # Main FastAPI application
├── models/                # Pydantic models
│   ├── user.py           # User, Role, Invitation models
│   ├── school.py         # School, AcademicYear, Term models
│   ├── student.py        # Student, ParentStudent models
│   ├── academic.py       # Class, Section, Subject models
│   ├── attendance.py     # Attendance, LeaveRequest models
│   └── grade.py          # Assignment, Submission, Grade models
├── routes/               # API endpoints
│   ├── auth.py           # Authentication endpoints
│   ├── schools.py        # School management
│   ├── users.py          # User management
│   ├── students.py       # Student management
│   ├── academic.py       # Academic management
│   ├── attendance.py     # Attendance tracking
│   ├── grades.py         # Gradebook
│   └── dashboard.py      # Dashboard data
└── utils/
    ├── auth.py           # JWT utilities
    └── helpers.py        # Helper functions
```

#### Frontend (React + Tailwind CSS)
```
/app/frontend/src/
├── App.js                 # Main app with routing
├── context/
│   └── AuthContext.js    # Authentication state
├── services/
│   └── api.js            # API client with axios
├── components/
│   ├── layout/           # Sidebar, Header, MainLayout
│   └── ui/               # shadcn/ui components
└── pages/
    ├── LoginPage.jsx
    ├── RegisterPage.jsx
    ├── DashboardPage.jsx
    ├── SchoolSetupPage.jsx
    ├── UsersPage.jsx
    ├── StudentsPage.jsx
    ├── ClassesPage.jsx
    ├── SubjectsPage.jsx
    ├── AttendancePage.jsx
    └── GradesPage.jsx
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new school with admin
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/invite` - Create invitation
- `POST /api/auth/invite/accept` - Accept invitation

#### Schools
- `GET /api/schools/current` - Get current school
- `PUT /api/schools/current` - Update school
- `POST /api/schools/complete-setup` - Mark setup complete
- `POST /api/schools/academic-years` - Create academic year
- `GET /api/schools/academic-years` - List academic years
- `POST /api/schools/terms` - Create term
- `GET /api/schools/terms` - List terms
- `POST /api/schools/holidays` - Create holiday
- `GET /api/schools/holidays` - List holidays

#### Users
- `GET /api/users` - List users (paginated)
- `POST /api/users` - Create user
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Deactivate user
- `GET /api/users/teachers` - List teachers
- `GET /api/users/parents` - List parents

#### Students
- `GET /api/students` - List students (paginated)
- `POST /api/students` - Create student
- `GET /api/students/{id}` - Get student details
- `PUT /api/students/{id}` - Update student
- `DELETE /api/students/{id}` - Deactivate student
- `POST /api/students/{id}/link-parent` - Link parent
- `GET /api/students/my-children` - Get parent's children

#### Academic
- `GET /api/academic/classes` - List classes
- `POST /api/academic/classes` - Create class
- `GET /api/academic/classes/{id}` - Get class details
- `GET /api/academic/sections` - List sections
- `POST /api/academic/sections` - Create section
- `GET /api/academic/subjects` - List subjects
- `POST /api/academic/subjects` - Create subject
- `POST /api/academic/class-subjects` - Assign subject to class
- `GET /api/academic/timetable/{class_id}` - Get timetable
- `POST /api/academic/enroll-student` - Enroll student

#### Attendance
- `POST /api/attendance` - Mark attendance
- `POST /api/attendance/bulk` - Bulk mark attendance
- `GET /api/attendance/class/{class_id}` - Get class attendance
- `GET /api/attendance/student/{student_id}` - Get student attendance
- `GET /api/attendance/summary/{class_id}` - Get attendance summary
- `POST /api/attendance/leave-request` - Create leave request
- `GET /api/attendance/leave-requests` - List leave requests

#### Grades
- `POST /api/grades/assignments` - Create assignment
- `GET /api/grades/assignments` - List assignments
- `GET /api/grades/assignments/{id}` - Get assignment details
- `POST /api/grades/submissions` - Submit assignment
- `POST /api/grades` - Create grade
- `POST /api/grades/bulk` - Bulk create grades
- `GET /api/grades/student/{student_id}` - Get student grades
- `GET /api/grades/my-grades` - Get current user grades

### Multi-Tenant Architecture
- All data is isolated by `school_id`
- Each school has its own:
  - Users (admin, teachers, parents, students)
  - Students and classes
  - Academic configuration
  - Attendance records
  - Grades and assignments

### Demo Credentials
- **School**: Demo School
- **Admin Email**: admin@demoschool.edu
- **Admin Password**: Admin@123

### Future Phases (Not Implemented)
- Phase 3: Portals (Teacher, Parent, Student portals)
- Phase 4: Financial Module (Fee management, invoicing, payments)
- Phase 5: Communication (Messaging, announcements, events)
- Phase 6: Advanced Features (Reports, analytics, integrations)
