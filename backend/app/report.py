import io
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def generate_markdown_report(project: Dict[str, Any], artifacts: List[Dict[str, Any]], findings: List[Dict[str, Any]]) -> str:
    """Generates an executive Markdown report of all blind spots."""
    md = []
    md.append(f"# BlindSpot AI Analysis Report: {project.get('name')}")
    md.append(f"**Domain:** {project.get('domain', 'General')} | **Status:** {project.get('status', 'Completed')} | **Total Findings:** {len(findings)}\n")
    
    if project.get("goal"):
        md.append(f"### Stated Objective\n> {project.get('goal')}\n")

    # Artifacts breakdown
    md.append("## Analyzed Artifacts")
    for a in artifacts:
        md.append(f"- **{a.get('name')}** (`{a.get('kind')}`) — {a.get('size_bytes', 0) // 1024 + 1} KB")
    md.append("\n---\n")

    # Severity distribution
    crit = [f for f in findings if f.get("tier") == "Critical"]
    high = [f for f in findings if f.get("tier") == "High"]
    med = [f for f in findings if f.get("tier") == "Medium"]
    low = [f for f in findings if f.get("tier") == "Low"]

    md.append("## Risk Executive Summary")
    md.append(f"| Severity Tier | Count | Definition |")
    md.append(f"| :--- | :---: | :--- |")
    md.append(f"| **Critical (>=75)** | **{len(crit)}** | Immediate operational failure or severe compliance/financial vulnerability |")
    md.append(f"| **High (55-74)** | **{len(high)}** | Major bottleneck or severe systemic assumption flaw |")
    md.append(f"| **Medium (35-54)** | **{len(med)}** | Moderate data quality, scale, or process deficiency |")
    md.append(f"| **Low (<35)** | **{len(low)}** | Minor gap or low-probability edge case |")
    md.append("\n---\n")

    # Detailed findings ordered by priority
    sorted_findings = sorted(findings, key=lambda x: x.get("priority", 0.0), reverse=True)
    md.append("## Detailed Blind Spots & Evidence\n")

    for idx, f in enumerate(sorted_findings, start=1):
        md.append(f"### {idx}. [{f.get('tier', 'Medium').upper()}] {f.get('title')}")
        md.append(f"- **Type:** `{f.get('type')}` | **Impact Score:** {f.get('impact', 0)}/100 | **Confidence:** {int(f.get('confidence', 0)*100)}% | **Priority:** {f.get('priority', 0)}")
        md.append(f"\n**Explanation:**\n{f.get('explanation')}\n")
        md.append(f"**Why It Matters:**\n{f.get('why_it_matters')}\n")

        # Evidence
        md.append("**Evidence:**")
        for ev in f.get("evidence", []):
            md.append(f"- [{ev.get('kind')}] `{ev.get('locator')}`: *\"{ev.get('excerpt')}\"*")
            if ev.get("detail"):
                md.append(f"  *Detail:* {ev.get('detail')}")

        # Sub-scores
        subs = f.get("sub_scores", {})
        if subs:
            md.append(f"\n**Sub-Scores Breakdown:**")
            md.append(f"- Severity: `{subs.get('severity', 0.5)}` | Likelihood: `{subs.get('likelihood', 0.5)}` | Breadth: `{subs.get('breadth', 0.5)}` | Irreversibility: `{subs.get('irreversibility', 0.5)}` | Time Sensitivity: `{subs.get('time_sensitivity', 0.5)}`")

        # Recommendations
        recs = f.get("recommendations", [])
        if recs:
            md.append("\n**Actionable Recommendations:**")
            for r in recs:
                md.append(f"- [{r.get('effort', 'medium').capitalize()} Effort] {r.get('action')}")

        # Questions
        questions = f.get("questions", [])
        if questions:
            md.append("\n**Questions to Challenge the Team:**")
            for q in questions:
                md.append(f"- {q}")

        md.append("\n---\n")

    return "\n".join(md)


def generate_pdf_report(project: Dict[str, Any], artifacts: List[Dict[str, Any]], findings: List[Dict[str, Any]]) -> bytes:
    """Generates a styled PDF report using ReportLab."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#1E1B4B')  # Deep indigo
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#475569'),
        spaceAfter=15
    )
    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1E1B4B'),
        spaceBefore=14,
        spaceAfter=6
    )
    finding_title_style = ParagraphStyle(
        'FindingTitle',
        parent=styles['Heading3'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=8,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
    )
    evidence_style = ParagraphStyle(
        'Evidence',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0F766E'),
        leftIndent=12,
        spaceAfter=2
    )

    story = []

    # Title & Header
    story.append(Paragraph(f"BlindSpot AI Audit: {project.get('name')}", title_style))
    story.append(Paragraph(f"Objective: {project.get('goal', 'N/A')} &bull; Domain: {project.get('domain', 'General')} &bull; Status: {project.get('status', 'Completed')}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#4338CA'), spaceAfter=15))

    # Summary metrics table
    crit = len([f for f in findings if f.get("tier") == "Critical"])
    high = len([f for f in findings if f.get("tier") == "High"])
    med = len([f for f in findings if f.get("tier") == "Medium"])
    low = len([f for f in findings if f.get("tier") == "Low"])

    summary_data = [
        ["Total Findings", "Critical (>=75)", "High (55-74)", "Medium (35-54)", "Low (<35)"],
        [str(len(findings)), str(crit), str(high), str(med), str(low)]
    ]
    t = Table(summary_data, colWidths=[105, 105, 105, 105, 105])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EEF2FF')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#312E81')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
    ]))
    story.append(t)
    story.append(Spacer(1, 15))

    # Findings Breakdown
    story.append(Paragraph("Ranked Blind Spots & Tangible Evidence", h2_style))
    sorted_findings = sorted(findings, key=lambda x: x.get("priority", 0.0), reverse=True)

    tier_colors = {
        "Critical": "#DC2626",
        "High": "#EA580C",
        "Medium": "#CA8A04",
        "Low": "#64748B"
    }

    for idx, f in enumerate(sorted_findings, start=1):
        t_color = tier_colors.get(f.get("tier"), "#4338CA")
        header_text = f"<b>{idx}. [{f.get('tier', 'Medium').upper()}] {f.get('title')}</b> (Impact: {f.get('impact')}, Priority: {f.get('priority')})"
        story.append(Paragraph(header_text, finding_title_style))
        story.append(Paragraph(f"<b>Explanation:</b> {f.get('explanation')}", body_style))
        story.append(Paragraph(f"<b>Operational Impact:</b> {f.get('why_it_matters')}", body_style))

        # Evidence
        story.append(Paragraph("<b>Tangible Evidence:</b>", body_style))
        for ev in f.get("evidence", []):
            ev_text = f"&bull; <i>[{ev.get('kind')}] {ev.get('locator')}</i>: &ldquo;{ev.get('excerpt')}&rdquo;"
            story.append(Paragraph(ev_text, evidence_style))

        # Recommendations
        recs = f.get("recommendations", [])
        if recs:
            rec_texts = [f"&bull; [{r.get('effort')}] {r.get('action')}" for r in recs]
            story.append(Paragraph(f"<b>Remediation:</b> {' '.join(rec_texts)}", body_style))

        story.append(Spacer(1, 8))

    doc.build(story)
    return buf.getvalue()
