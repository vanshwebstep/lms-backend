# MySQL Setup For LearnFlow LMS

Database name:

```text
lms_db
```

Main schema file:

```text
E:\lms-backend\database\schema.sql
```

## Setup

1. Open MySQL Workbench, phpMyAdmin, or terminal.
2. Run the full `database/schema.sql` file.
3. Confirm database `lms_db` exists.
4. Create `.env` from `.env.example` only if your MySQL values differ from the defaults.

Terminal option:

```bash
mysql -u root -p < E:\lms-backend\database\schema.sql
```

Default API base:

```text
http://localhost:5000/api
```

## Demo Login Accounts

Password for all accounts:

```text
password123
```

Accounts:

```text
admin@learnflow.local
coach@learnflow.local
student@learnflow.local
```

## Tables Created

Core:

```text
users
user_profiles
courses
course_requirements
course_outcomes
payments
enrollments
notifications
sessions
revoked_tokens
password_otps
reset_tokens
platform_settings
uploads
```

Learning/content:

```text
lessons
lesson_topics
lesson_progress
assignments
assignment_submissions
quizzes
quiz_questions
quiz_attempts
certificates
```

## Current Backend Structure

```text
src/index.js
src/config/db.js
src/config/env.js
src/config/constants.js
src/middleware/auth.js
src/routes/*.routes.js
src/controllers/*.js
src/models/*.model.js
src/services/*.js
src/utils/*.js
```

## API Coverage Status

Done and linked:

```text
Auth/login/register/profile/password
Admin stats/coaches/students/courses/payments/reports/settings/subscriptions
Coach courses/lessons/topics/quizzes/assignments/materials/pricing/students/earnings
Student browse/enroll/payment/my-learning/progress/lessons/quizzes/assignments/certificates
Notifications and global search
```

Notes:

```text
Pricing plans are stored in platform_settings as pricing_plans:<coachId> JSON.
Materials now store real uploaded files in E:\\lms-backend\\uploads and return BACKEND_PUBLIC_URL based links.
Payments currently use PAYMENT_PROVIDER=demo. For live gateway, set PAYMENT_PROVIDER=razorpay and fill RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET, then replace demo verification with provider signature verification.
```
