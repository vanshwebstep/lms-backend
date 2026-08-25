const fs = require('fs')
const path = require('path')
const env = require('../config/env')
const db = require('../config/db')
const { makeId } = require('../utils/id')
const { parseJson } = require('./learning.model')
const { saveUploadedFile, typeFromMime, uploadRoot } = require('../services/upload')
const { recalculateEnrollmentProgress } = require('./progress.model')

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))

const certificateFileName = (certificateNo) => `${String(certificateNo || makeId('cert')).replace(/[^a-z0-9-]+/gi, '-')}.html`

const writeCertificateFile = (row) => {
  if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true })
  const fileName = certificateFileName(row.certificate_no)
  const fullPath = path.join(uploadRoot, fileName)
  if (!fs.existsSync(fullPath)) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(row.certificate_no)}</title><style>body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:48px;color:#0f172a}.card{max-width:820px;margin:auto;background:white;border:12px solid #0ea5e9;padding:56px;text-align:center}.eyebrow{letter-spacing:.28em;text-transform:uppercase;color:#0369a1;font-weight:800}.title{font-size:42px;margin:22px 0 8px}.name{font-size:32px;font-weight:900;margin:18px 0}.course{font-size:24px;font-weight:800}.meta{margin-top:32px;color:#475569}.no{margin-top:28px;font-size:13px;color:#64748b}</style></head><body><main class="card"><div class="eyebrow">Certificate of Completion</div><h1 class="title">LearnFlow</h1><p>This certifies that</p><div class="name">${escapeHtml(row.student_name || 'Student')}</div><p>has successfully completed</p><div class="course">${escapeHtml(row.course_title || 'Course')}</div><div class="meta">Issued on ${new Date(row.issued_at || Date.now()).toLocaleDateString('en-IN')}</div><div class="no">Certificate No: ${escapeHtml(row.certificate_no)}</div></main></body></html>`
    fs.writeFileSync(fullPath, html)
  }
  return `${env.publicUrl}/uploads/${encodeURIComponent(fileName)}`
}

const ensureCertificateFiles = async (studentId) => {
  const rows = await db.query(
    `SELECT cert.*, c.title AS course_title, u.name AS student_name
     FROM certificates cert
     JOIN courses c ON c.id = cert.course_id
     JOIN users u ON u.id = cert.student_id
     WHERE cert.student_id = ? AND (cert.file_url IS NULL OR cert.file_url = '')`,
    [studentId]
  )
  for (const row of rows) {
    const fileUrl = writeCertificateFile(row)
    await db.query('UPDATE certificates SET file_url = ? WHERE id = ?', [fileUrl, row.id])
  }
}
const mapMaterial = (row) => ({
  id: row.id,
  ownerId: row.owner_id,
  type: row.file_type,
  name: row.original_name,
  url: row.file_url,
  mimeType: row.mime_type || '',
  sizeBytes: Number(row.size_bytes || 0),
  createdAt: row.created_at,
})

const listMaterials = async (ownerId) => {
  const rows = await db.query('SELECT * FROM uploads WHERE owner_id = ? ORDER BY created_at DESC', [ownerId])
  return rows.map(mapMaterial)
}

const createMaterial = async (ownerId, body, fileType = 'document') => {
  const uploaded = body.files?.[0] ? saveUploadedFile(body.files[0]) : null
  const inferredType = uploaded ? uploaded.type : fileType || typeFromMime(body.mimeType || '')
  const id = makeId('upload')
  await db.query(
    `INSERT INTO uploads (id, owner_id, file_type, original_name, file_url, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      ownerId,
      inferredType,
      uploaded?.originalName || String(body.name || body.originalName || body.fileName || 'Material').trim(),
      uploaded ? `${env.publicUrl}${uploaded.url}` : body.url || body.fileUrl || body.contentUrl || '',
      uploaded?.mimeType || body.mimeType || null,
      uploaded?.sizeBytes || body.sizeBytes || body.size || null,
    ]
  )
  return mapMaterial(await db.first('SELECT * FROM uploads WHERE id = ?', [id]))
}

const removeMaterial = async (ownerId, id) => {
  const existing = await db.first('SELECT id FROM uploads WHERE id = ? AND owner_id = ?', [id, ownerId])
  if (!existing) return false
  await db.query('DELETE FROM uploads WHERE id = ?', [id])
  return true
}

const settingsKey = (coachId) => `pricing_plans:${coachId}`

const listPricingPlans = async (coachId) => {
  const row = await db.first('SELECT setting_value FROM platform_settings WHERE setting_key = ?', [settingsKey(coachId)])
  return parseJson(row?.setting_value, [])
}

const savePricingPlans = async (coachId, plans) => {
  await db.query(
    `INSERT INTO platform_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [settingsKey(coachId), JSON.stringify(plans)]
  )
  return plans
}

const createPricingPlan = async (coachId, body) => {
  if (body.courseId) {
    const course = await db.first('SELECT id FROM courses WHERE id = ? AND coach_id = ?', [body.courseId, coachId])
    if (!course) return null
  }
  const plans = await listPricingPlans(coachId)
  const plan = {
    id: makeId('plan'),
    courseId: body.courseId || null,
    courseTitle: body.courseTitle || body.course || '',
    name: String(body.name || '').trim(),
    price: Number(body.price || 0),
    duration: Number(body.duration || body.durationDays || 30),
    features: Array.isArray(body.features) ? body.features : String(body.features || '').split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
    popular: Boolean(body.popular),
    status: body.status || 'active',
    createdAt: new Date().toISOString(),
  }
  plans.unshift(plan)
  await savePricingPlans(coachId, plans)
  return plan
}

const updatePricingPlan = async (coachId, id, body) => {
  const plans = await listPricingPlans(coachId)
  let updated = null
  const next = plans.map((plan) => {
    if (String(plan.id) !== String(id)) return plan
    updated = {
      ...plan,
      ...body,
      price: body.price !== undefined ? Number(body.price) : plan.price,
      duration: body.duration !== undefined || body.durationDays !== undefined ? Number(body.duration || body.durationDays) : plan.duration,
      features: Array.isArray(body.features)
        ? body.features
        : body.features !== undefined
          ? String(body.features).split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean)
          : plan.features,
      updatedAt: new Date().toISOString(),
    }
    return updated
  })
  if (!updated) return null
  await savePricingPlans(coachId, next)
  return updated
}

const removePricingPlan = async (coachId, id) => {
  const plans = await listPricingPlans(coachId)
  const next = plans.filter((plan) => String(plan.id) !== String(id))
  if (next.length === plans.length) return false
  await savePricingPlans(coachId, next)
  return true
}

const listCertificates = async (studentId) => {
  const rows = await db.query(
    `SELECT cert.*, c.title AS course_title, c.category
     FROM certificates cert
     JOIN courses c ON c.id = cert.course_id
     WHERE cert.student_id = ?
     ORDER BY cert.issued_at DESC`,
    [studentId]
  )
  return rows.map((row) => ({
    id: row.id,
    certificateNo: row.certificate_no,
    fileUrl: row.file_url || '',
    issuedAt: row.issued_at,
    course: { id: row.course_id, title: row.course_title, category: row.category },
    enrollmentId: row.enrollment_id,
  }))
}

const autoIssueCertificates = async (studentId) => {
  const enrollments = await db.query("SELECT id FROM enrollments WHERE student_id = ? AND status = 'active'", [studentId])
  for (const enrollment of enrollments) {
    await recalculateEnrollmentProgress(enrollment.id)
  }

  const completed = await db.query(
    `SELECT e.*
     FROM enrollments e
     LEFT JOIN certificates c ON c.enrollment_id = e.id
     WHERE e.student_id = ? AND e.progress >= 100 AND c.id IS NULL`,
    [studentId]
  )
  for (const enrollment of completed) {
    await db.query(
      `INSERT INTO certificates (id, student_id, course_id, enrollment_id, certificate_no, file_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        makeId('cert'),
        studentId,
        enrollment.course_id,
        enrollment.id,
        `LF-${Date.now()}-${String(enrollment.course_id).slice(-4).toUpperCase()}`,
        null,
      ]
    )
  }
  await ensureCertificateFiles(studentId)
  return listCertificates(studentId)
}
module.exports = {
  listMaterials,
  createMaterial,
  removeMaterial,
  listPricingPlans,
  createPricingPlan,
  updatePricingPlan,
  removePricingPlan,
  listCertificates,
  autoIssueCertificates,
}

