const db = require('../config/db')
const env = require('../config/env')

const DEFAULT_TEMPLATES = [
  {
    module: 'student',
    action: 'student-registered',
    subject: 'Welcome to {{appName}} - Your Account is Ready!',
    variables: JSON.stringify(['name', 'email', 'appName', 'loginUrl']),
    html_template: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f7fa;color:#333;}.container{max-width:600px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);}.header{background:#4f46e5;padding:30px 20px;text-align:center;color:#ffffff;}.header h1{margin:0;font-size:24px;}.content{padding:30px 25px;line-height:1.6;}.button{display:inline-block;padding:12px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0;}.footer{background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>Welcome to {{appName}}! 🚀</h1></div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      <p>Thank you for joining <strong>{{appName}}</strong>. We are thrilled to have you as part of our global learning community.</p>
      <p>You can now explore thousands of expert-led courses, test your skills with quizzes, and earn recognized certificates.</p>
      <div style="text-align:center;"><a href="{{loginUrl}}" class="button" style="color:#ffffff;">Go to Your Dashboard</a></div>
      <p>If you have any questions, feel free to reach out to our support team anytime.</p>
      <p>Happy Learning,<br><strong>The {{appName}} Team</strong></p>
    </div>
    <div class="footer"><p>&copy; {{appName}}. All rights reserved.</p></div>
  </div>
</body>
</html>`,
  },
  {
    module: 'student',
    action: 'course-purchased',
    subject: 'Enrollment Confirmed: {{courseName}}',
    variables: JSON.stringify(['name', 'courseName', 'amount', 'currency', 'coachName', 'appName', 'loginUrl']),
    html_template: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f7fa;color:#333;}.container{max-width:600px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);}.header{background:#10b981;padding:30px 20px;text-align:center;color:#ffffff;}.header h1{margin:0;font-size:24px;}.content{padding:30px 25px;line-height:1.6;}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:15px 20px;margin:20px 0;}.button{display:inline-block;padding:12px 28px;background:#10b981;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0;}.footer{background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>Payment Successful! 🎉</h1></div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>You are officially enrolled in <strong>{{courseName}}</strong>. Your transaction has been completed successfully.</p>
      <div class="card">
        <h3 style="margin-top:0;color:#0f172a;">Purchase Summary</h3>
        <p style="margin:5px 0;"><strong>Course:</strong> {{courseName}}</p>
        <p style="margin:5px 0;"><strong>Instructor:</strong> {{coachName}}</p>
        <p style="margin:5px 0;"><strong>Amount Paid:</strong> {{currency}} {{amount}}</p>
        <p style="margin:5px 0;"><strong>Access:</strong> Full Lifetime Access</p>
      </div>
      <div style="text-align:center;"><a href="{{loginUrl}}" class="button" style="color:#ffffff;">Start Learning Now</a></div>
      <p>Best of luck with your coursework!<br><strong>{{appName}} Team</strong></p>
    </div>
    <div class="footer"><p>&copy; {{appName}}. All rights reserved.</p></div>
  </div>
</body>
</html>`,
  },
  {
    module: 'student',
    action: 'assignment-graded',
    subject: 'Your Assignment has been Graded: {{assignmentTitle}}',
    variables: JSON.stringify(['name', 'assignmentTitle', 'courseName', 'score', 'maxScore', 'feedback', 'appName', 'loginUrl']),
    html_template: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f7fa;color:#333;}.container{max-width:600px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);}.header{background:#6366f1;padding:30px 20px;text-align:center;color:#ffffff;}.content{padding:30px 25px;line-height:1.6;}.score-box{background:#eef2ff;border-left:4px solid #6366f1;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;}.button{display:inline-block;padding:12px 28px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0;}.footer{background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}</style></head>
<body>
  <div class="container">
    <div class="header"><h1 style="margin:0;font-size:22px;">Assignment Graded 📝</h1></div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      <p>Your coach has reviewed and graded your submission for <strong>{{assignmentTitle}}</strong> in <em>{{courseName}}</em>.</p>
      <div class="score-box">
        <p style="margin:0;font-size:18px;font-weight:bold;color:#312e81;">Score: {{score}} / {{maxScore}}</p>
        <p style="margin:8px 0 0 0;color:#475569;"><strong>Feedback:</strong> {{feedback}}</p>
      </div>
      <div style="text-align:center;"><a href="{{loginUrl}}" class="button" style="color:#ffffff;">View Submission Details</a></div>
      <p>Keep up the great work!<br><strong>{{appName}} Team</strong></p>
    </div>
    <div class="footer"><p>&copy; {{appName}}. All rights reserved.</p></div>
  </div>
</body>
</html>`,
  },
  {
    module: 'student',
    action: 'certificate-issued',
    subject: 'Congratulations! Your Certificate for {{courseName}} is Ready',
    variables: JSON.stringify(['name', 'courseName', 'certificateNo', 'appName', 'loginUrl']),
    html_template: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f7fa;color:#333;}.container{max-width:600px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);}.header{background:#f59e0b;padding:30px 20px;text-align:center;color:#ffffff;}.content{padding:30px 25px;line-height:1.6;}.cert-badge{text-align:center;padding:20px;background:#fffbeb;border:2px dashed #f59e0b;border-radius:8px;margin:20px 0;}.button{display:inline-block;padding:12px 28px;background:#f59e0b;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0;}.footer{background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}</style></head>
<body>
  <div class="container">
    <div class="header"><h1 style="margin:0;font-size:22px;">Course Completed! 🎓</h1></div>
    <div class="content">
      <h2>Congratulations {{name}}!</h2>
      <p>You have successfully completed 100% of the curriculum for <strong>{{courseName}}</strong>.</p>
      <div class="cert-badge">
        <h3 style="margin:0;color:#b45309;">Verified Certificate of Completion</h3>
        <p style="margin:8px 0 0 0;font-family:monospace;color:#78350f;">Certificate ID: {{certificateNo}}</p>
      </div>
      <div style="text-align:center;"><a href="{{loginUrl}}" class="button" style="color:#ffffff;">Download Your Certificate</a></div>
      <p>Share your achievement with your network!<br><strong>{{appName}} Team</strong></p>
    </div>
    <div class="footer"><p>&copy; {{appName}}. All rights reserved.</p></div>
  </div>
</body>
</html>`,
  },
  {
    module: 'coach',
    action: 'course-enrolled',
    subject: 'New Student Enrolled in {{courseName}}',
    variables: JSON.stringify(['name', 'studentName', 'studentEmail', 'courseName', 'amount', 'currency', 'appName', 'loginUrl']),
    html_template: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f7fa;color:#333;}.container{max-width:600px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);}.header{background:#0284c7;padding:30px 20px;text-align:center;color:#ffffff;}.content{padding:30px 25px;line-height:1.6;}.card{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:15px;margin:20px 0;}.button{display:inline-block;padding:12px 28px;background:#0284c7;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0;}.footer{background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}</style></head>
<body>
  <div class="container">
    <div class="header"><h1 style="margin:0;font-size:22px;">New Student Enrollment 🌟</h1></div>
    <div class="content">
      <h2>Hello Coach {{name}},</h2>
      <p>A new student has enrolled in your course <strong>{{courseName}}</strong>.</p>
      <div class="card">
        <p style="margin:5px 0;"><strong>Student Name:</strong> {{studentName}}</p>
        <p style="margin:5px 0;"><strong>Student Email:</strong> {{studentEmail}}</p>
        <p style="margin:5px 0;"><strong>Revenue:</strong> {{currency}} {{amount}}</p>
      </div>
      <div style="text-align:center;"><a href="{{loginUrl}}" class="button" style="color:#ffffff;">View Student Progress</a></div>
      <p>Best regards,<br><strong>{{appName}} Instructor Studio</strong></p>
    </div>
    <div class="footer"><p>&copy; {{appName}}. All rights reserved.</p></div>
  </div>
</body>
</html>`,
  },
  {
    module: 'coach',
    action: 'assignment-submitted',
    subject: 'New Assignment Submission: {{assignmentTitle}}',
    variables: JSON.stringify(['name', 'studentName', 'assignmentTitle', 'courseName', 'appName', 'loginUrl']),
    html_template: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f7fa;color:#333;}.container{max-width:600px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);}.header{background:#8b5cf6;padding:30px 20px;text-align:center;color:#ffffff;}.content{padding:30px 25px;line-height:1.6;}.button{display:inline-block;padding:12px 28px;background:#8b5cf6;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0;}.footer{background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}</style></head>
<body>
  <div class="container">
    <div class="header"><h1 style="margin:0;font-size:22px;">Assignment Submission Received 📥</h1></div>
    <div class="content">
      <h2>Hello Coach {{name}},</h2>
      <p>Student <strong>{{studentName}}</strong> has submitted their work for <strong>{{assignmentTitle}}</strong> in <em>{{courseName}}</em>.</p>
      <p>You can review their submission and assign feedback in your coach studio.</p>
      <div style="text-align:center;"><a href="{{loginUrl}}" class="button" style="color:#ffffff;">Grade Submission</a></div>
      <p>Happy teaching,<br><strong>{{appName}} Studio</strong></p>
    </div>
    <div class="footer"><p>&copy; {{appName}}. All rights reserved.</p></div>
  </div>
</body>
</html>`,
  },
  {
    module: 'admin',
    action: 'coach-created',
    subject: 'Welcome to {{appName}} - Your Coach Credentials',
    variables: JSON.stringify(['name', 'email', 'password', 'appName', 'loginUrl']),
    html_template: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f7fa;color:#333;}.container{max-width:600px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);}.header{background:#0f172a;padding:30px 20px;text-align:center;color:#ffffff;}.content{padding:30px 25px;line-height:1.6;}.cred-box{background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:15px 20px;margin:20px 0;}.button{display:inline-block;padding:12px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0;}.footer{background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}</style></head>
<body>
  <div class="container">
    <div class="header"><h1 style="margin:0;font-size:22px;">Welcome to {{appName}} Coach Studio</h1></div>
    <div class="content">
      <h2>Welcome {{name}},</h2>
      <p>An instructor account has been created for you on <strong>{{appName}}</strong>. Here are your login credentials:</p>
      <div class="cred-box">
        <p style="margin:5px 0;"><strong>Login Email:</strong> {{email}}</p>
        <p style="margin:5px 0;"><strong>Temporary Password:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">{{password}}</code></p>
      </div>
      <p>Please log in and update your password from your account settings.</p>
      <div style="text-align:center;"><a href="{{loginUrl}}" class="button" style="color:#ffffff;">Log In to Coach Studio</a></div>
      <p>Best regards,<br><strong>{{appName}} Administration</strong></p>
    </div>
    <div class="footer"><p>&copy; {{appName}}. All rights reserved.</p></div>
  </div>
</body>
</html>`,
  },
  {
    module: 'admin',
    action: 'forgot-password',
    subject: 'Password Reset Code - {{appName}}',
    variables: JSON.stringify(['name', 'otp', 'resetToken', 'appName', 'loginUrl']),
    html_template: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f7fa;color:#333;}.container{max-width:600px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);}.header{background:#ef4444;padding:30px 20px;text-align:center;color:#ffffff;}.content{padding:30px 25px;line-height:1.6;}.otp-box{text-align:center;padding:20px;background:#fef2f2;border:2px dashed #ef4444;border-radius:8px;margin:20px 0;}.otp{font-size:32px;font-weight:bold;letter-spacing:6px;color:#b91c1c;margin:10px 0;}.footer{background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}</style></head>
<body>
  <div class="container">
    <div class="header"><h1 style="margin:0;font-size:22px;">Reset Your Password 🔒</h1></div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      <p>We received a request to reset your password for your <strong>{{appName}}</strong> account. Use the one-time verification code below to proceed:</p>
      <div class="otp-box">
        <p style="margin:0;color:#991b1b;font-weight:600;">Your Verification Code:</p>
        <div class="otp">{{otp}}</div>
        <p style="margin:0;font-size:12px;color:#64748b;">This code will expire in 10 minutes.</p>
      </div>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
      <p>Stay secure,<br><strong>The {{appName}} Security Team</strong></p>
    </div>
    <div class="footer"><p>&copy; {{appName}}. All rights reserved.</p></div>
  </div>
</body>
</html>`,
  },
  {
    module: 'admin',
    action: 'new-enrollment',
    subject: 'Platform Alert: New Course Sale on {{appName}}',
    variables: JSON.stringify(['name', 'studentName', 'studentEmail', 'courseName', 'coachName', 'amount', 'currency', 'appName']),
    html_template: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f7fa;color:#333;}.container{max-width:600px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);}.header{background:#1e293b;padding:30px 20px;text-align:center;color:#ffffff;}.content{padding:30px 25px;line-height:1.6;}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:15px;margin:20px 0;}.footer{background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}</style></head>
<body>
  <div class="container">
    <div class="header"><h1 style="margin:0;font-size:22px;">New Transaction Alert 💰</h1></div>
    <div class="content">
      <h2>Hello Admin,</h2>
      <p>A new course enrollment transaction has occurred on the platform.</p>
      <div class="card">
        <p style="margin:5px 0;"><strong>Student:</strong> {{studentName}} ({{studentEmail}})</p>
        <p style="margin:5px 0;"><strong>Course:</strong> {{courseName}}</p>
        <p style="margin:5px 0;"><strong>Instructor:</strong> {{coachName}}</p>
        <p style="margin:5px 0;"><strong>Total Revenue:</strong> {{currency}} {{amount}}</p>
      </div>
      <p>System notification generated automatically by <strong>{{appName}}</strong>.</p>
    </div>
    <div class="footer"><p>&copy; {{appName}}. All rights reserved.</p></div>
  </div>
</body>
</html>`,
  },
]

const parseJson = (value, fallback = []) => {
  if (!value) return fallback
  if (Array.isArray(value)) return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const hydrateConfig = (row) => {
  if (!row) return null
  return {
    id: row.id,
    module: row.module,
    action: row.action,
    subject: row.subject,
    html_template: row.html_template,
    smtp_host: row.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
    smtp_secure: Boolean(Number(row.smtp_secure !== undefined ? row.smtp_secure : 1)),
    smtp_port: Number(row.smtp_port || process.env.SMTP_PORT || 465),
    smtp_username: row.smtp_username || process.env.SMTP_USER || '',
    smtp_password: row.smtp_password || process.env.SMTP_PASS || '',
    from_email: row.from_email || process.env.SMTP_USER || 'learnflow@example.com',
    from_name: row.from_name || process.env.APP_NAME || 'LearnFlow',
    status: Number(row.status !== undefined ? row.status : 1),
    variables: parseJson(row.variables, ['name', 'appName', 'loginUrl']),
    to: row.to || '',
    cc: row.cc || '',
    bcc: row.bcc || '',
    coach_id: row.coach_id || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

const seedDefaults = async () => {
  try {
    for (const item of DEFAULT_TEMPLATES) {
      const existing = await db.first(
        'SELECT id FROM email_configs WHERE module = ? AND action = ? AND coach_id IS NULL LIMIT 1',
        [item.module, item.action]
      )
      if (!existing) {
        await db.query(
          `INSERT INTO email_configs
           (coach_id, module, action, subject, html_template, smtp_host, smtp_secure, smtp_port, smtp_username, smtp_password, from_email, from_name, status, variables, createdAt, updatedAt)
           VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            item.module,
            item.action,
            item.subject,
            item.html_template,
            process.env.SMTP_HOST || 'smtp.gmail.com',
            process.env.SMTP_SECURE === 'false' ? 0 : 1,
            Number(process.env.SMTP_PORT || 465),
            process.env.SMTP_USER || 'kapilakshu848@gmail.com',
            process.env.SMTP_PASS || 'testpassword123',
            process.env.SMTP_USER || 'kapilakshu848@gmail.com',
            env.appName || 'LearnFlow',
            1,
            item.variables,
          ]
        )
      }
    }
  } catch (err) {
    console.error('Error seeding email templates:', err.message)
  }
}

const findConfig = async (module, action, coachId = null) => {
  if (coachId) {
    const coachRow = await db.first(
      'SELECT * FROM email_configs WHERE module = ? AND action = ? AND coach_id = ? LIMIT 1',
      [module, action, coachId]
    )
    if (coachRow) {
      const hydrated = hydrateConfig(coachRow)
      hydrated.isCustom = true
      return hydrated
    }
  }

  // Fallback to Admin Global Default (coach_id IS NULL)
  const defaultRow = await db.first(
    'SELECT * FROM email_configs WHERE module = ? AND action = ? AND coach_id IS NULL LIMIT 1',
    [module, action]
  )
  const hydrated = hydrateConfig(defaultRow)
  if (hydrated) hydrated.isCustom = false
  return hydrated
}

const findById = async (id) => {
  const row = await db.first('SELECT * FROM email_configs WHERE id = ? LIMIT 1', [id])
  return hydrateConfig(row)
}

const listAll = async ({ module, role, coachId } = {}) => {
  await seedDefaults()

  if (role === 'coach' && coachId) {
    // 1. Get all admin default templates for coach and student modules
    const defaults = await db.query(
      'SELECT * FROM email_configs WHERE coach_id IS NULL AND module IN ("coach", "student") ORDER BY module ASC, action ASC'
    )
    // 2. Get all custom templates saved by this coach
    const customRows = await db.query(
      'SELECT * FROM email_configs WHERE coach_id = ? ORDER BY module ASC, action ASC',
      [coachId]
    )
    const customMap = new Map()
    for (const c of customRows) {
      customMap.set(`${c.module}:${c.action}`, c)
    }

    return defaults.map((def) => {
      const key = `${def.module}:${def.action}`
      if (customMap.has(key)) {
        const cRow = customMap.get(key)
        const hydrated = hydrateConfig(cRow)
        hydrated.isCustom = true
        hydrated.defaultSubject = def.subject
        hydrated.defaultHtml = def.html_template
        return hydrated
      }
      const hydrated = hydrateConfig(def)
      hydrated.isCustom = false
      return hydrated
    })
  }

  // Admin sees all global defaults
  const conditions = ['coach_id IS NULL']
  const params = []

  if (module && module !== 'all') {
    conditions.push('module = ?')
    params.push(module)
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const rows = await db.query(`SELECT * FROM email_configs ${where} ORDER BY module ASC, action ASC`, params)
  return rows.map((r) => {
    const h = hydrateConfig(r)
    h.isCustom = false
    return h
  })
}

const saveCoachTemplate = async (coachId, { module, action, subject, html_template, status }) => {
  const existing = await db.first(
    'SELECT id FROM email_configs WHERE coach_id = ? AND module = ? AND action = ? LIMIT 1',
    [coachId, module, action]
  )
  const def = await db.first(
    'SELECT * FROM email_configs WHERE coach_id IS NULL AND module = ? AND action = ? LIMIT 1',
    [module, action]
  )

  if (existing) {
    await db.query(
      `UPDATE email_configs SET
        subject = ?,
        html_template = ?,
        status = ?,
        updatedAt = NOW()
       WHERE id = ?`,
      [subject, html_template, status !== undefined ? Number(status) : 1, existing.id]
    )
    const updated = await findById(existing.id)
    if (updated) updated.isCustom = true
    return updated
  }

  const result = await db.query(
    `INSERT INTO email_configs
     (coach_id, module, action, subject, html_template, smtp_host, smtp_secure, smtp_port, smtp_username, smtp_password, from_email, from_name, status, variables, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      coachId,
      module,
      action,
      subject,
      html_template,
      def?.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
      def?.smtp_secure !== undefined ? def.smtp_secure : 1,
      Number(def?.smtp_port || 465),
      def?.smtp_username || '',
      def?.smtp_password || '',
      def?.from_email || '',
      def?.from_name || env.appName || 'LearnFlow',
      status !== undefined ? Number(status) : 1,
      def?.variables || JSON.stringify(['name', 'appName', 'loginUrl']),
    ]
  )
  const created = await findById(result.insertId)
  if (created) created.isCustom = true
  return created
}

const resetCoachTemplate = async (coachId, module, action) => {
  await db.query(
    'DELETE FROM email_configs WHERE coach_id = ? AND module = ? AND action = ?',
    [coachId, module, action]
  )
  return findConfig(module, action, null)
}

const create = async (data) => {
  const result = await db.query(
    `INSERT INTO email_configs
     (coach_id, module, action, subject, html_template, smtp_host, smtp_secure, smtp_port, smtp_username, smtp_password, from_email, from_name, status, variables, \`to\`, cc, bcc, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.coach_id || null,
      data.module || 'student',
      data.action,
      data.subject,
      data.html_template || '',
      data.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
      data.smtp_secure ? 1 : 0,
      Number(data.smtp_port || 465),
      data.smtp_username || '',
      data.smtp_password || '',
      data.from_email || '',
      data.from_name || env.appName || 'LearnFlow',
      data.status !== undefined ? Number(data.status) : 1,
      JSON.stringify(data.variables || ['name', 'appName', 'loginUrl']),
      data.to || null,
      data.cc || null,
      data.bcc || null,
    ]
  )
  return findById(result.insertId)
}

const update = async (id, data) => {
  const existing = await findById(id)
  if (!existing) return null

  await db.query(
    `UPDATE email_configs SET
      subject = ?,
      html_template = ?,
      smtp_host = ?,
      smtp_secure = ?,
      smtp_port = ?,
      smtp_username = ?,
      smtp_password = ?,
      from_email = ?,
      from_name = ?,
      status = ?,
      variables = ?,
      \`to\` = ?,
      cc = ?,
      bcc = ?,
      updatedAt = NOW()
     WHERE id = ?`,
    [
      data.subject !== undefined ? data.subject : existing.subject,
      data.html_template !== undefined ? data.html_template : existing.html_template,
      data.smtp_host !== undefined ? data.smtp_host : existing.smtp_host,
      data.smtp_secure !== undefined ? (data.smtp_secure ? 1 : 0) : (existing.smtp_secure ? 1 : 0),
      Number(data.smtp_port !== undefined ? data.smtp_port : existing.smtp_port),
      data.smtp_username !== undefined ? data.smtp_username : existing.smtp_username,
      data.smtp_password !== undefined ? data.smtp_password : existing.smtp_password,
      data.from_email !== undefined ? data.from_email : existing.from_email,
      data.from_name !== undefined ? data.from_name : existing.from_name,
      data.status !== undefined ? Number(data.status) : existing.status,
      JSON.stringify(data.variables !== undefined ? data.variables : existing.variables),
      data.to !== undefined ? data.to : existing.to,
      data.cc !== undefined ? data.cc : existing.cc,
      data.bcc !== undefined ? data.bcc : existing.bcc,
      id,
    ]
  )

  return findById(id)
}

const remove = async (id) => {
  const existing = await findById(id)
  if (!existing) return null
  await db.query('DELETE FROM email_configs WHERE id = ?', [id])
  return existing
}

module.exports = {
  findConfig,
  findById,
  listAll,
  saveCoachTemplate,
  resetCoachTemplate,
  create,
  update,
  remove,
  seedDefaults,
  DEFAULT_TEMPLATES,
}
