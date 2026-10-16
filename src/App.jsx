import { useEffect, useState } from 'react'
import schoolLogoUrl from './assets/mfp.png'
import darkSchoolLogoUrl from './assets/mfp_dark.png'
import './App.css'

const initialSubjects = () => [
  { id: crypto.randomUUID(), subject: 'Mathematics', marks: '', total: '100', remarks: '' },
  { id: crypto.randomUUID(), subject: 'English', marks: '', total: '100', remarks: '' },
  { id: crypto.randomUUID(), subject: 'Science', marks: '', total: '100', remarks: '' },
]

const createSection = (name) => ({
  name,
  subjects: initialSubjects(),
  comment: '',
  attendance: '',
  behaviour: '',
})

const createTerm = (number) => ({
  number,
  evaluations: [createSection('Formative Evaluation'), createSection('Summative Evaluation')],
})

const gradeFor = (percentage) => {
  if (percentage === null) return '—'
  if (percentage >= 80) return 'A'
  if (percentage >= 65) return 'B'
  if (percentage >= 50) return 'C'
  if (percentage >= 35) return 'D'
  return 'E'
}

const gradeCommentFor = (grade) => {
  if (grade === 'A') return 'Very Good'
  if (grade === 'B') return 'Good'
  if (grade === 'C') return 'Satisfactory'
  if (grade === 'D') return 'Average'
  if (grade === 'E') return 'Not Satisfied'
  return 'Enter marks to calculate the overall grade comment.'
}

const gradeRangeFor = (grade) => {
  if (grade === 'A') return '80–100%'
  if (grade === 'B') return '65–<80%'
  if (grade === 'C') return '50–<65%'
  if (grade === 'D') return '35–<50%'
  return '<35%'
}

const gradeDescriptorFor = (grade) => {
  if (grade === 'A') return 'Very Good'
  if (grade === 'B') return 'Good'
  if (grade === 'C') return 'Satisfactory'
  if (grade === 'D') return 'Average'
  return 'Not Satisfied'
}

const calculateSection = (subjects) => {
  const completed = subjects.filter((subject) => {
    if (subject.marks === '' || subject.total === '') return false
    const marks = Number(subject.marks)
    const total = Number(subject.total)
    return Number.isFinite(marks) && Number.isFinite(total) && total > 0 && marks >= 0 && marks <= total
  })
  const marks = completed.reduce((sum, subject) => sum + Number(subject.marks), 0)
  const total = completed.reduce((sum, subject) => sum + Number(subject.total), 0)
  const percentage = total > 0 ? (marks / total) * 100 : null
  return { marks, total, percentage, grade: gradeFor(percentage), completedCount: completed.length }
}

const formatPercentage = (percentage) => percentage === null ? '—' : `${percentage.toFixed(1)}%`
function App({ userEmail, onSignOut }) {
  const [theme, setTheme] = useState(() => window.localStorage.getItem('result-card-theme') === 'dark' ? 'dark' : 'light')
  const [student, setStudent] = useState({ name: '', roll: '', grade: '', year: '' })
  const [terms, setTerms] = useState([1, 2, 3].map(createTerm))
  const [activeTerm, setActiveTerm] = useState(0)
  const [exporting, setExporting] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('result-card-theme', theme)
  }, [theme])

  const updateStudent = (key, value) => setStudent((current) => ({ ...current, [key]: value }))

  const updateEvaluation = (termIndex, evaluationIndex, updater) => {
    setTerms((current) => current.map((term, index) => index === termIndex
      ? { ...term, evaluations: term.evaluations.map((evaluation, evaluationNumber) => evaluationNumber === evaluationIndex ? updater(evaluation) : evaluation) }
      : term))
  }

  const updateSubject = (termIndex, evaluationIndex, subjectId, key, value) => {
    updateEvaluation(termIndex, evaluationIndex, (section) => ({
      ...section,
      subjects: section.subjects.map((subject) => subject.id === subjectId ? { ...subject, [key]: value } : subject),
    }))
  }

  const addSubject = (termIndex, evaluationIndex) => updateEvaluation(termIndex, evaluationIndex, (section) => ({
    ...section,
    subjects: [...section.subjects, { id: crypto.randomUUID(), subject: '', marks: '', total: '100', remarks: '' }],
  }))

  const removeSubject = (termIndex, evaluationIndex, subjectId) => updateEvaluation(termIndex, evaluationIndex, (section) => ({
    ...section,
    subjects: section.subjects.filter((subject) => subject.id !== subjectId),
  }))

  const termResults = terms.map((term) => {
    const evaluations = term.evaluations.map((section) => calculateSection(section.subjects))
    const marks = evaluations.reduce((sum, result) => sum + result.marks, 0)
    const total = evaluations.reduce((sum, result) => sum + result.total, 0)
    const completed = evaluations.every((result) => result.completedCount > 0)
    const percentage = completed && total > 0 ? (marks / total) * 100 : null
    return { evaluations, marks, total, completed, percentage, grade: gradeFor(percentage) }
  })
  const overallMarks = termResults.reduce((sum, result) => sum + result.marks, 0)
  const overallTotal = termResults.reduce((sum, result) => sum + result.total, 0)
  const allTermsComplete = termResults.every((result) => result.completed)
  const overallPercentage = allTermsComplete && overallTotal > 0 ? (overallMarks / overallTotal) * 100 : null
  const overallGrade = gradeFor(overallPercentage)

  const getExportRows = (section) => section.subjects
    .filter((subject) => subject.subject.trim() || subject.marks !== '' || subject.remarks.trim())
    .map((subject) => {
      const marks = Number(subject.marks)
      const total = Number(subject.total)
      const valid = subject.marks !== '' && subject.total !== '' && total > 0 && marks >= 0 && marks <= total
      const percentage = valid ? (marks / total) * 100 : null
      return [subject.subject || '—', subject.marks || '—', subject.total || '—', formatPercentage(percentage), gradeFor(percentage), subject.remarks || '—']
    })

  const validateForm = () => {
    const form = document.querySelector('.student-form')
    return form?.reportValidity() ?? false
  }

  const exportPdf = async () => {
    if (!validateForm()) return
    setExporting('pdf')
    try {
      const [{ jsPDF }, { default: autoTable }, logoResponse] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        fetch(schoolLogoUrl),
      ])
      const logoBytes = new Uint8Array(await logoResponse.arrayBuffer())
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, pageWidth, 40, 'F')
      pdf.addImage(logoBytes, 'JPEG', 15, 5, 29, 29)
      pdf.setTextColor(27, 62, 54)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(15)
      pdf.text('Mathurapur Free Primary School', pageWidth / 2, 13, { align: 'center' })
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(78, 91, 82)
      pdf.setFontSize(8)
      pdf.text('Village: Mathurapur, Post: Sonarpur, District: South 24 Parganas', pageWidth / 2, 20, { align: 'center' })
      pdf.setFontSize(9)
      pdf.text(`Three terms  ·  Academic year ${student.year}`, pageWidth / 2, 29, { align: 'center' })
      pdf.setDrawColor(27, 62, 54)
      pdf.setLineWidth(0.7)
      pdf.line(15, 39, pageWidth - 15, 39)

      autoTable(pdf, {
        startY: 46,
        head: [['STUDENT', 'ROLL / ID', 'CLASS / GRADE']],
        body: [[student.name, student.roll, student.grade]],
        theme: 'grid',
        headStyles: { fillColor: [239, 243, 238], textColor: [48, 66, 58], fontStyle: 'bold' },
        bodyStyles: { textColor: [37, 46, 40], cellPadding: 3.5 },
        styles: { fontSize: 9, lineColor: [220, 226, 220] },
        margin: { left: 15, right: 15 },
      })

      let cursor = pdf.lastAutoTable.finalY + 10
      terms.forEach((term, termIndex) => {
        if (cursor > 245) {
          pdf.addPage()
          cursor = 18
        }
        pdf.setTextColor(27, 62, 54)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(15)
        pdf.text(`TERM ${['I', 'II', 'III'][termIndex]}`, 15, cursor)
        cursor += 7

        term.evaluations.forEach((section, evaluationIndex) => {
          pdf.setFontSize(11)
          pdf.text(section.name, 15, cursor)
          autoTable(pdf, {
            startY: cursor + 3,
            head: [['Subject', 'Marks obtained', 'Total', 'Percentage', 'Grade', 'Remarks']],
            body: getExportRows(section).length ? getExportRows(section) : [['No scores entered', '', '', '', '', '']],
            theme: 'grid',
            headStyles: { fillColor: [27, 62, 54], textColor: [255, 255, 255], fontStyle: 'bold' },
            bodyStyles: { textColor: [37, 46, 40], cellPadding: 2.8 },
            styles: { fontSize: 8, lineColor: [220, 226, 220], overflow: 'linebreak' },
            columnStyles: { 0: { cellWidth: 44 }, 1: { cellWidth: 28 }, 2: { cellWidth: 18 }, 3: { cellWidth: 23 }, 4: { cellWidth: 17 } },
            margin: { left: 15, right: 15 },
          })
          cursor = pdf.lastAutoTable.finalY + 5
          const lines = []
          if (evaluationIndex === 0) {
            lines.push(`Attendance: ${section.attendance || '—'}  ·  Behaviour / character: ${section.behaviour || '—'}`)
          }
          lines.push(`Class teacher comment: ${section.comment || '—'}`)
          pdf.setTextColor(70, 79, 72)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8)
          lines.forEach((line) => {
            const wrapped = pdf.splitTextToSize(line, pageWidth - 30)
            pdf.text(wrapped, 15, cursor)
            cursor += wrapped.length * 4 + 1
          })
          cursor += 3
        })

        if (cursor > 265) {
          pdf.addPage()
          cursor = 18
        }
        const result = termResults[termIndex]
        pdf.setFillColor(239, 243, 238)
        pdf.rect(15, cursor, pageWidth - 30, 13, 'F')
        pdf.setTextColor(27, 62, 54)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.text(`TERM ${['I', 'II', 'III'][termIndex]} OVERALL: ${formatPercentage(result.percentage)}  ·  GRADE ${result.grade}`, 19, cursor + 8.5)
        cursor += 21
      })
      if (cursor > 270) {
        pdf.addPage()
        cursor = 18
      }
      pdf.setTextColor(27, 62, 54)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.text(`ALL TERMS OVERALL: ${formatPercentage(overallPercentage)}  ·  GRADE ${overallGrade}`, 15, cursor)
      cursor += 8
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(70, 79, 72)
      pdf.setFontSize(7)
      const gradeScale = pdf.splitTextToSize('Grade scale: A 80–100% Very Good | B 65–<80% Good | C 50–<65% Satisfactory | D 35–<50% Average | E below 35% Not Satisfied.', pageWidth - 30)
      pdf.text(gradeScale, 15, cursor)
      cursor += gradeScale.length * 4 + 3
      if (cursor > 270) {
        pdf.addPage()
        cursor = 18
      }
      const overallGradeComment = gradeCommentFor(overallGrade)
      pdf.setFillColor(27, 62, 54)
      pdf.roundedRect(15, cursor, pageWidth - 30, 15, 2, 2, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.text(`OVERALL GRADE COMMENT: ${overallGradeComment}`, pageWidth / 2, cursor + 9.5, { align: 'center' })
      pdf.save(`${student.name.trim().replace(/\s+/g, '-') || 'student'}-result-card.pdf`)
    } finally {
      setExporting('')
    }
  }

  const exportDocx = async () => {
    if (!validateForm()) return
    setExporting('docx')
    try {
      const [{ saveAs }, { AlignmentType, Document, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType }, logoResponse] = await Promise.all([
        import('file-saver'),
        import('docx'),
        fetch(schoolLogoUrl),
      ])
      const logoBytes = new Uint8Array(await logoResponse.arrayBuffer())
      const makeCell = (text, isHeader = false) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: isHeader, color: isHeader ? 'FFFFFF' : '26332C', size: 18 })] })],
        shading: { fill: isHeader ? '1B3E36' : 'F7F9F6' },
        margins: { top: 90, bottom: 90, left: 100, right: 100 },
      })
      const makeTable = (headers, rows) => new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: headers.map((header) => makeCell(header, true)), tableHeader: true }),
          ...rows.map((row) => new TableRow({ children: row.map((value) => makeCell(value)) })),
        ],
      })
      const children = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: logoBytes, transformation: { width: 82, height: 82 }, type: 'jpg' })],
          spacing: { after: 80 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Mathurapur Free Primary School', bold: true, color: '1B3E36', font: 'Georgia', size: 32 })],
          spacing: { after: 50 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Village: Mathurapur, Post: Sonarpur, District: South 24 Parganas', color: '4E5B52', size: 18 })],
          spacing: { after: 100 },
        }),
        new Paragraph({ text: `Terms I, II and III  |  Academic year ${student.year}`, alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
        makeTable(['Student', 'Roll / ID', 'Class / grade'], [[student.name, student.roll, student.grade]]),
        new Paragraph({ text: '', spacing: { after: 120 } }),
      ]

      terms.forEach((term, termIndex) => {
        children.push(new Paragraph({ text: `TERM ${['I', 'II', 'III'][termIndex]}`, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }))
        term.evaluations.forEach((section, evaluationIndex) => {
          const rows = getExportRows(section)
          children.push(new Paragraph({ text: section.name, heading: HeadingLevel.HEADING_2, spacing: { before: 120, after: 80 } }))
          children.push(makeTable(
            ['Subject', 'Marks obtained', 'Total', 'Percentage', 'Grade', 'Remarks'],
            rows.length ? rows : [['No scores entered', '', '', '', '', '']],
          ))
          if (evaluationIndex === 0) {
            children.push(new Paragraph({ text: `Attendance: ${section.attendance || '—'}    Behaviour / character: ${section.behaviour || '—'}`, spacing: { before: 100 } }))
          }
          children.push(new Paragraph({ text: `Class teacher comment: ${section.comment || '—'}`, spacing: { after: 120 } }))
        })
        children.push(new Paragraph({ text: `TERM ${['I', 'II', 'III'][termIndex]} OVERALL: ${formatPercentage(termResults[termIndex].percentage)}    GRADE: ${termResults[termIndex].grade}`, heading: HeadingLevel.HEADING_2, spacing: { before: 100, after: 160 } }))
      })
      children.push(new Paragraph({ text: `ALL TERMS OVERALL: ${formatPercentage(overallPercentage)}    GRADE: ${overallGrade}`, heading: HeadingLevel.HEADING_2, spacing: { before: 180 } }))
      children.push(new Paragraph({ text: `OVERALL GRADE COMMENT: ${gradeCommentFor(overallGrade)}`, heading: HeadingLevel.HEADING_2, spacing: { before: 180 } }))
      children.push(new Paragraph({ text: 'Grade scale: A 80–100% Very Good | B 65–<80% Good | C 50–<65% Satisfactory | D 35–<50% Average | E below 35% Not Satisfied.', spacing: { before: 100 } }))
      const document = new Document({ sections: [{ children }] })
      const blob = await Packer.toBlob(document)
      saveAs(blob, `${student.name.trim().replace(/\s+/g, '-') || 'student'}-result-card.docx`)
    } finally {
      setExporting('')
    }
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Classroom home">
          <span className="brand-mark">C</span>
          <span>CLASSROOM<span className="brand-light"> / RECORDS</span></span>
        </a>
        <div className="topbar-actions">
          <button
            className="theme-toggle"
            type="button"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
            <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          </button>
          <div className="topbar-meta"><span className="status-dot" /> RESULT CARD BUILDER</div>
          <span className="signed-in-identity">{userEmail}</span>
          <button className="sign-out-button" type="button" onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      <div className="workspace" id="top">
        <aside className="intro-panel">
          <img className="school-crest" src={theme === 'dark' ? darkSchoolLogoUrl : schoolLogoUrl} alt="Mathurapur Free Primary School crest" />
          <p className="eyebrow">STUDENT ACADEMIC RECORDS <span>01 — 03</span></p>
          <h1>Mathurapur<br /><em>FP School</em></h1>
          <p className="intro-copy">Three-term student result cards.</p>
          <div className="grade-guide">
            <p className="guide-title">GRADE SCALE <span>BY PERCENTAGE</span></p>
            <div className="grade-list">
              {['A', 'B', 'C', 'D', 'E'].map((grade) => (
                <span key={grade}><b>{grade}</b><small>{gradeRangeFor(grade)}</small><small>{gradeDescriptorFor(grade)}</small></span>
              ))}
            </div>
          </div>
          {/* <p className="save-note"><span className="save-icon">↳</span> Your card is created locally and ready to export.</p> */}
        </aside>

        <section className="editor-panel" aria-label="Student result card editor">
          <div className="editor-heading">
            <div>
              <p className="eyebrow">NEW RECORD <span>•</span> {student.year || 'ACADEMIC YEAR'}</p>
              <h2>Student result card</h2>
            </div>
            <span className="draft-badge">DRAFT</span>
          </div>

          <form className="student-form">
            <section className="identity-section" aria-labelledby="student-details-heading">
              <div className="section-heading">
                <span className="section-number">01</span>
                <h3 id="student-details-heading">Student details</h3>
                <span className="section-rule" />
              </div>
              <div className="identity-grid">
                <label className="field field-wide">Student name
                  <input required value={student.name} onChange={(event) => updateStudent('name', event.target.value)} placeholder="e.g. Amina Patel" />
                </label>
                <label className="field">Roll / ID
                  <input required value={student.roll} onChange={(event) => updateStudent('roll', event.target.value)} placeholder="e.g. 0248" />
                </label>
                <label className="field">Class / grade
                  <input required value={student.grade} onChange={(event) => updateStudent('grade', event.target.value)} placeholder="e.g. Grade 8" />
                </label>
                <label className="field">Academic year
                  <input required value={student.year} onChange={(event) => updateStudent('year', event.target.value)} placeholder="e.g. 2025–2026" />
                </label>
              </div>
            </section>

            <nav className="term-tabs" aria-label="Select academic term">
              {terms.map((term, termIndex) => (
                <button
                  className={`term-tab ${activeTerm === termIndex ? 'active' : ''}`}
                  type="button"
                  key={term.number}
                  aria-current={activeTerm === termIndex ? 'step' : undefined}
                  onClick={() => setActiveTerm(termIndex)}
                >
                  <span>TERM {['I', 'II', 'III'][termIndex]}</span>
                  <small>{termResults[termIndex].completed ? `${formatPercentage(termResults[termIndex].percentage)} complete` : 'In progress'}</small>
                </button>
              ))}
            </nav>

            {terms[activeTerm].evaluations.map((section, evaluationIndex) => {
              return (
                <section className="evaluation-section" key={`${activeTerm}-${section.name}`} aria-labelledby={`evaluation-${activeTerm}-${evaluationIndex}`}>
                  <div className="section-heading evaluation-title">
                    <span className="section-number">0{evaluationIndex + 2}</span>
                    <h3 id={`evaluation-${activeTerm}-${evaluationIndex}`}>{section.name}</h3>
                    <span className="section-rule" />
                    <span className="auto-label"><span /> AUTO-CALCULATED</span>
                  </div>
                  <div className="table-scroll">
                    <table className="marks-table">
                      <thead><tr><th>Subject</th><th>Marks obtained</th><th>Total</th><th>Percentage</th><th>Grade</th><th>Remarks</th><th><span className="sr-only">Remove subject</span></th></tr></thead>
                      <tbody>
                        {section.subjects.map((subject) => {
                          const valid = subject.marks !== '' && subject.total !== '' && Number(subject.total) > 0 && Number(subject.marks) >= 0 && Number(subject.marks) <= Number(subject.total)
                          const percentage = valid ? (Number(subject.marks) / Number(subject.total)) * 100 : null
                          return (
                            <tr key={subject.id}>
                              <td><input aria-label="Subject" value={subject.subject} onChange={(event) => updateSubject(activeTerm, evaluationIndex, subject.id, 'subject', event.target.value)} placeholder="Subject name" /></td>
                              <td><input aria-label="Marks obtained" type="number" min="0" max={subject.total || undefined} step="any" value={subject.marks} onChange={(event) => updateSubject(activeTerm, evaluationIndex, subject.id, 'marks', event.target.value)} placeholder="—" /></td>
                              <td><input aria-label="Total marks" type="number" min="1" step="any" value={subject.total} onChange={(event) => updateSubject(activeTerm, evaluationIndex, subject.id, 'total', event.target.value)} placeholder="100" /></td>
                              <td className="calculated-cell">{formatPercentage(percentage)}</td>
                              <td><span className={`grade-pill ${gradeFor(percentage) === '—' ? 'grade-empty' : ''}`}>{gradeFor(percentage)}</span></td>
                              <td><input aria-label="Remarks" value={subject.remarks} onChange={(event) => updateSubject(activeTerm, evaluationIndex, subject.id, 'remarks', event.target.value)} placeholder="Optional" /></td>
                              <td><button className="remove-row" type="button" onClick={() => removeSubject(activeTerm, evaluationIndex, subject.id)} aria-label={`Remove ${subject.subject || 'subject'}`} title="Remove subject">×</button></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button className="add-subject" type="button" onClick={() => addSubject(activeTerm, evaluationIndex)}><span>+</span> Add subject</button>

                  {evaluationIndex === 0 && (
                    <div className="teacher-fields formative-fields">
                      <label className="field">Attendance
                        <input value={section.attendance} onChange={(event) => updateEvaluation(activeTerm, evaluationIndex, (current) => ({ ...current, attendance: event.target.value }))} placeholder="e.g. 96% or 42 / 45 days" />
                      </label>
                      <label className="field">Behaviour / character
                        <input value={section.behaviour} onChange={(event) => updateEvaluation(activeTerm, evaluationIndex, (current) => ({ ...current, behaviour: event.target.value }))} placeholder="e.g. Excellent" />
                      </label>
                    </div>
                  )}
                  <label className="field comment-field">Class teacher comment
                    <textarea rows="2" value={section.comment} onChange={(event) => updateEvaluation(activeTerm, evaluationIndex, (current) => ({ ...current, comment: event.target.value }))} placeholder="Add a comment about the student's progress..." />
                  </label>
                </section>
              )
            })}

            <section className="term-summary" aria-label={`Term ${['I', 'II', 'III'][activeTerm]} overall`}>
              <div className="term-summary-copy">
                <span>TERM {['I', 'II', 'III'][activeTerm]} OVERALL</span>
                <strong>{formatPercentage(termResults[activeTerm].percentage)}</strong>
                <small>{termResults[activeTerm].completed ? `${termResults[activeTerm].marks} of ${termResults[activeTerm].total} marks across both evaluations` : 'Enter valid marks in both evaluations'}</small>
              </div>
              <div className="term-summary-grade"><span>TERM GRADE</span><strong>{termResults[activeTerm].grade}</strong></div>
            </section>

            <section className="result-section" aria-label="Overall result">
              <div>
                <span className="result-kicker">ALL TERMS OVERALL <span>•</span> {formatPercentage(overallPercentage)}</span>
                <h3>{gradeCommentFor(overallGrade)}</h3>
                <p>{overallGrade === '—' ? 'Complete both evaluations for all three terms to calculate the overall grade.' : `Overall grade ${overallGrade}`}</p>
              </div>
              <div className="overall-grade"><span>OVERALL GRADE</span><strong>{overallGrade}</strong></div>
            </section>

            <footer className="export-footer">
              <p>Download a polished copy of this result card.</p>
              <div className="export-actions">
                <button type="button" className="export-button docx-button" onClick={exportDocx} disabled={Boolean(exporting)}><span className="file-icon">W</span>{exporting === 'docx' ? 'Preparing…' : 'Export DOCX'}</button>
                <button type="button" className="export-button pdf-button" onClick={exportPdf} disabled={Boolean(exporting)}><span className="file-icon">P</span>{exporting === 'pdf' ? 'Preparing…' : 'Export PDF'}</button>
              </div>
            </footer>
          </form>
        </section>
      </div>
      <footer className="page-footer"><span>CLASSROOM / RECORDS</span><span>ACADEMIC PROGRESS, CLEARLY RECORDED</span></footer>
    </main>
  )
}

export default App
