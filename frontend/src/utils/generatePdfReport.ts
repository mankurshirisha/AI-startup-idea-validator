/**
 * utils/generatePdfReport.ts
 * Executive Client-Side PDF Report Generator for AI Startup Idea Validator.
 *
 * Consumes 100% existing dashboard data in-memory.
 * Zero external AI/LLM API calls or credits required.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ValidationResult } from '@/types/dashboard'

// Extended interface for jsPDF with autoTable properties
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable?: {
    finalY: number
  }
}

export async function generatePdfReport(data: ValidationResult): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as ExtendedJsPDF

  const pageWidth = 210
  const pageHeight = 297
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Color Palette
  const colors = {
    primary: [30, 27, 75] as [number, number, number], // #1E1B4B Deep Indigo
    accent: [79, 70, 229] as [number, number, number], // #4F46E5 Indigo
    accentLight: [238, 242, 255] as [number, number, number], // #EEF2FF
    textDark: [15, 23, 42] as [number, number, number], // #0F172A Slate 900
    textBody: [51, 65, 85] as [number, number, number], // #334155 Slate 700
    textMuted: [100, 116, 139] as [number, number, number], // #64748B Slate 500
    border: [226, 232, 240] as [number, number, number], // #E2E8F0 Slate 200
    bgLight: [248, 250, 252] as [number, number, number], // #F8FAFC Slate 50
    success: [22, 163, 74] as [number, number, number], // #16A34A Green
    warning: [217, 119, 6] as [number, number, number], // #D97706 Amber
    danger: [220, 38, 38] as [number, number, number], // #DC2626 Red
  }

  // Helper: Check space and add page if needed
  const ensureSpace = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - 20) {
      doc.addPage()
      y = margin + 8
    }
  }

  // Helper: Section Header
  const renderSectionHeader = (title: string, subtitle?: string) => {
    ensureSpace(subtitle ? 18 : 14)
    doc.setFillColor(...colors.accent)
    doc.rect(margin, y, 3.5, 7.5, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...colors.primary)
    doc.text(title, margin + 6, y + 5.5)
    y += 9

    if (subtitle) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...colors.textMuted)
      doc.text(subtitle, margin + 6, y)
      y += 5
    }
    y += 2
  }

  // Helper: Render Callout Card
  const renderCalloutBox = (
    title: string,
    content: string,
    bgColor = colors.bgLight,
    borderColor = colors.border,
    titleColor = colors.accent
  ) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const splitText = doc.splitTextToSize(content, contentWidth - 12)
    const textHeight = splitText.length * 4.2
    const boxHeight = textHeight + (title ? 12 : 8)

    ensureSpace(boxHeight)

    doc.setFillColor(...bgColor)
    doc.setDrawColor(...borderColor)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD')

    let currentBoxY = y + 5
    if (title) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...titleColor)
      doc.text(title, margin + 6, currentBoxY)
      currentBoxY += 5
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.8)
    doc.setTextColor(...colors.textBody)
    doc.text(splitText, margin + 6, currentBoxY)

    y += boxHeight + 4
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1. EXECUTIVE HEADER BANNER
  // ═══════════════════════════════════════════════════════════════════
  const bannerHeight = 36
  doc.setFillColor(...colors.primary)
  doc.rect(margin, y, contentWidth, bannerHeight, 'F')

  // Banner Accent Bar
  doc.setFillColor(...colors.accent)
  doc.rect(margin, y, 4, bannerHeight, 'F')

  // Report Label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(200, 210, 255)
  doc.text('EXECUTIVE VALIDATION REPORT', margin + 8, y + 8)

  // Startup Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(255, 255, 255)
  const titleLines = doc.splitTextToSize(data.idea || 'Startup Validation Assessment', contentWidth - 65)
  doc.text(titleLines.slice(0, 2), margin + 8, y + 16)

  // Date & Generation Notice
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(190, 200, 230)
  const formattedDate = new Date(data.createdAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  doc.text(`Generated: ${formattedDate}  |  Multi-Agent BI Pipeline`, margin + 8, y + 30)

  // Right Score Box
  const scoreBoxWidth = 48
  const scoreBoxX = margin + contentWidth - scoreBoxWidth - 6
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(scoreBoxX, y + 4, scoreBoxWidth, 28, 2, 2, 'F')

  const score = data.validationScore ?? 0
  const scoreColor =
    score >= 75 ? colors.success : score >= 50 ? colors.accent : colors.warning

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...scoreColor)
  doc.text(`${score}`, scoreBoxX + 6, y + 18)

  doc.setFontSize(9)
  doc.setTextColor(...colors.textMuted)
  doc.text('/100', scoreBoxX + 22, y + 18)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...colors.textDark)
  doc.text(data.status?.toUpperCase() || 'VALIDATED', scoreBoxX + 6, y + 25)

  y += bannerHeight + 5

  // ═══════════════════════════════════════════════════════════════════
  // 2. STARTUP METADATA OVERVIEW TABLE
  // ═══════════════════════════════════════════════════════════════════
  const metadataRows = [
    [
      { content: 'Industry / Domain:', styles: { fontStyle: 'bold' as const, textColor: colors.textMuted } },
      { content: data.industry || data.market?.industry || 'Technology' },
      { content: 'Target Market / Country:', styles: { fontStyle: 'bold' as const, textColor: colors.textMuted } },
      { content: data.targetCountry || 'Global / North America' },
    ],
    [
      { content: 'Target Customer:', styles: { fontStyle: 'bold' as const, textColor: colors.textMuted } },
      { content: data.targetCustomer || 'B2B / B2C Early Adopters' },
      { content: 'Startup Stage:', styles: { fontStyle: 'bold' as const, textColor: colors.textMuted } },
      { content: data.startupStage || 'Idea Stage / MVP' },
    ],
    [
      { content: 'Business Model:', styles: { fontStyle: 'bold' as const, textColor: colors.textMuted } },
      { content: data.businessModel || 'SaaS / Subscription' },
      { content: 'Strategic Verdict:', styles: { fontStyle: 'bold' as const, textColor: colors.textMuted } },
      {
        content: data.verdict || data.finalVerdict?.decision || 'Promising Opportunity',
        styles: { fontStyle: 'bold' as const, textColor: colors.accent },
      },
    ],
  ]

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: metadataRows,
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      textColor: colors.textDark,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 49 },
      2: { cellWidth: 46 },
      3: { cellWidth: 45 },
    },
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 5

  // ═══════════════════════════════════════════════════════════════════
  // 3. EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  renderSectionHeader('1. Executive Summary', 'Comprehensive assessment and strategic viability verdict')

  if (data.executiveSummary) {
    renderCalloutBox('Executive Overview', data.executiveSummary, colors.accentLight, colors.accent, colors.accent)
  }

  if (data.finalVerdict?.rationale) {
    renderCalloutBox(
      `Strategic Verdict: ${data.finalVerdict.decision || 'Recommendation'}`,
      data.finalVerdict.rationale,
      colors.bgLight,
      colors.border,
      colors.textDark
    )
  }

  // Key Features if provided
  if (data.keyFeatures && data.keyFeatures.length > 0) {
    ensureSpace(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...colors.primary)
    doc.text('Key Proposed Capabilities:', margin, y)
    y += 4

    data.keyFeatures.forEach((feat) => {
      ensureSpace(6)
      doc.setFillColor(...colors.accent)
      doc.circle(margin + 2, y - 1, 1, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...colors.textBody)
      const featLines = doc.splitTextToSize(feat, contentWidth - 8)
      doc.text(featLines, margin + 6, y)
      y += featLines.length * 3.8 + 1.5
    })
    y += 3
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. SCORE BREAKDOWN
  // ═══════════════════════════════════════════════════════════════════
  if (data.scoreBreakdown && data.scoreBreakdown.length > 0) {
    renderSectionHeader('2. Score Breakdown & Dimension Analysis', 'Evaluation across 6 core pillars of startup success')

    const scoreTableBody = data.scoreBreakdown.map((item) => {
      const details = [
        item.explanation,
        item.whyAssigned ? `Why Assigned: ${item.whyAssigned}` : '',
        item.whatIncreased ? `Score Driver: ${item.whatIncreased}` : '',
        item.improvementSuggestion ? `Recommendation: ${item.improvementSuggestion}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')

      return [
        {
          content: `${item.title}\n(${item.score}/100)`,
          styles: { fontStyle: 'bold' as const, textColor: colors.primary, halign: 'center' as const },
        },
        {
          content: details,
          styles: { textColor: colors.textBody },
        },
      ]
    })

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Dimension & Score', 'Detailed Rationale, Drivers & Strategic Recommendations']],
      body: scoreTableBody,
      theme: 'grid',
      headStyles: {
        fillColor: colors.primary,
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: colors.border,
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: contentWidth - 38 },
      },
    })

    y = (doc.lastAutoTable?.finalY ?? y) + 6
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. MARKET OPPORTUNITY
  // ═══════════════════════════════════════════════════════════════════
  if (data.market) {
    renderSectionHeader('3. Market Opportunity & Sizing', 'Market size, growth dynamics, and target demand signals')

    const marketSizingRows = [
      [
        { content: 'Total Addressable Market (TAM)', styles: { fontStyle: 'bold' as const } },
        data.market.tam || data.market.marketSize || 'N/A',
        { content: 'Serviceable Addressable Market (SAM)', styles: { fontStyle: 'bold' as const } },
        data.market.sam || 'N/A',
      ],
      [
        { content: 'Serviceable Obtainable Market (SOM)', styles: { fontStyle: 'bold' as const } },
        data.market.som || 'N/A',
        { content: 'Annual Growth Rate (CAGR)', styles: { fontStyle: 'bold' as const } },
        data.market.growthRate || 'N/A',
      ],
    ]

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: marketSizingRows,
      theme: 'grid',
      styles: {
        fontSize: 8.2,
        cellPadding: 2.8,
        lineColor: colors.border,
        lineWidth: 0.2,
        textColor: colors.textDark,
      },
      columnStyles: {
        0: { cellWidth: 55, fillColor: colors.bgLight },
        1: { cellWidth: 36, textColor: colors.accent, fontStyle: 'bold' },
        2: { cellWidth: 55, fillColor: colors.bgLight },
        3: { cellWidth: 36, textColor: colors.accent, fontStyle: 'bold' },
      },
    })

    y = (doc.lastAutoTable?.finalY ?? y) + 4

    // Market Trends & Drivers
    const allTrends = [
      ...(data.market.trends || []),
      ...(data.insights?.trends || []),
    ].filter((v, i, a) => a.indexOf(v) === i)

    if (allTrends.length > 0) {
      ensureSpace(14)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.8)
      doc.setTextColor(...colors.primary)
      doc.text('Key Industry & Market Trends:', margin, y)
      y += 4

      allTrends.slice(0, 5).forEach((trend) => {
        ensureSpace(6)
        doc.setFillColor(...colors.accent)
        doc.circle(margin + 2, y - 1, 1, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...colors.textBody)
        const trendLines = doc.splitTextToSize(trend, contentWidth - 8)
        doc.text(trendLines, margin + 6, y)
        y += trendLines.length * 3.6 + 1.2
      })
      y += 3
    }

    // Pain Points & Growth Drivers
    if (data.insights?.painPoints && data.insights.painPoints.length > 0) {
      ensureSpace(14)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.8)
      doc.setTextColor(...colors.primary)
      doc.text('Validated Customer Pain Points:', margin, y)
      y += 4

      data.insights.painPoints.slice(0, 4).forEach((point) => {
        ensureSpace(6)
        doc.setFillColor(...colors.warning)
        doc.circle(margin + 2, y - 1, 1, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...colors.textBody)
        const lines = doc.splitTextToSize(point, contentWidth - 8)
        doc.text(lines, margin + 6, y)
        y += lines.length * 3.6 + 1.2
      })
      y += 3
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. COMPETITOR ANALYSIS & BENCHMARKING
  // ═══════════════════════════════════════════════════════════════════
  const competitorList = data.enrichedCompetitors || data.competitors || []
  if (competitorList.length > 0) {
    renderSectionHeader('4. Competitor Analysis & Benchmarking', 'Direct competitors, feature overlap, and strategic differentiation')

    const competitorRows = competitorList.map((comp) => {
      const strengthsText = comp.strengths?.length ? `Strengths: ${comp.strengths.join(', ')}` : ''
      const weaknessesText = comp.weaknesses?.length ? `Weaknesses: ${comp.weaknesses.join(', ')}` : ''
      const diffText = comp.differentiation ? `Our Advantage: ${comp.differentiation}` : ''
      const threatText = comp.biggestThreat ? `Key Threat: ${comp.biggestThreat}` : ''

      const combinedDetails = [
        comp.description,
        strengthsText,
        weaknessesText,
        diffText,
        threatText,
      ]
        .filter(Boolean)
        .join('\n\n')

      return [
        {
          content: `${comp.name}\n\n${comp.country ? `Region: ${comp.country}\n` : ''}${comp.pricingModel ? `Pricing: ${comp.pricingModel}\n` : ''}${comp.similarity ? `Similarity: ${comp.similarity}%` : ''}`.trim(),
          styles: { fontStyle: 'bold' as const, textColor: colors.primary },
        },
        {
          content: combinedDetails,
          styles: { textColor: colors.textBody },
        },
      ]
    })

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Competitor & Positioning', 'Strengths, Weaknesses, Differentiation & Market Threat']],
      body: competitorRows,
      theme: 'grid',
      headStyles: {
        fillColor: colors.primary,
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: colors.border,
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: contentWidth - 42 },
      },
    })

    y = (doc.lastAutoTable?.finalY ?? y) + 6
  }

  // ═══════════════════════════════════════════════════════════════════
  // 7. SWOT & RISK ANALYSIS
  // ═══════════════════════════════════════════════════════════════════
  if (data.swot) {
    renderSectionHeader('5. SWOT & Risk Analysis', 'Internal capabilities versus external market forces')

    const swotData = [
      [
        {
          content: `STRENGTHS:\n${(data.swot.strengths || []).map((s) => `• ${s}`).join('\n')}`,
          styles: { fillColor: [240, 253, 244] as [number, number, number], textColor: [21, 128, 61] as [number, number, number] },
        },
        {
          content: `WEAKNESSES:\n${(data.swot.weaknesses || []).map((w) => `• ${w}`).join('\n')}`,
          styles: { fillColor: [254, 242, 242] as [number, number, number], textColor: [185, 28, 28] as [number, number, number] },
        },
      ],
      [
        {
          content: `OPPORTUNITIES:\n${(data.swot.opportunities || []).map((o) => `• ${o}`).join('\n')}`,
          styles: { fillColor: [239, 246, 255] as [number, number, number], textColor: [29, 78, 216] as [number, number, number] },
        },
        {
          content: `THREATS:\n${(data.swot.threats || []).map((t) => `• ${t}`).join('\n')}`,
          styles: { fillColor: [255, 251, 235] as [number, number, number], textColor: [180, 83, 9] as [number, number, number] },
        },
      ],
    ]

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: swotData,
      theme: 'grid',
      styles: {
        fontSize: 7.8,
        cellPadding: 3,
        lineColor: colors.border,
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: contentWidth / 2 },
        1: { cellWidth: contentWidth / 2 },
      },
    })

    y = (doc.lastAutoTable?.finalY ?? y) + 5
  }

  // Risk Assessment Table
  if (data.riskAnalysis && data.riskAnalysis.length > 0) {
    ensureSpace(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.8)
    doc.setTextColor(...colors.primary)
    doc.text('Key Risk Factors & Mitigation Overview:', margin, y)
    y += 3

    const riskRows = data.riskAnalysis.map((r) => {
      const riskColor =
        r.level?.toLowerCase() === 'high'
          ? colors.danger
          : r.level?.toLowerCase() === 'medium'
          ? colors.warning
          : colors.success

      return [
        { content: r.type, styles: { fontStyle: 'bold' as const, textColor: colors.textDark } },
        { content: r.level, styles: { fontStyle: 'bold' as const, textColor: riskColor, halign: 'center' as const } },
        { content: r.explanation, styles: { textColor: colors.textBody } },
      ]
    })

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Risk Category', 'Level', 'Assessment & Mitigation Rationale']],
      body: riskRows,
      theme: 'grid',
      headStyles: {
        fillColor: colors.primary,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 2.5,
      },
      styles: {
        fontSize: 7.8,
        cellPadding: 2.5,
        lineColor: colors.border,
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 20 },
        2: { cellWidth: contentWidth - 58 },
      },
    })

    y = (doc.lastAutoTable?.finalY ?? y) + 6
  }

  // ═══════════════════════════════════════════════════════════════════
  // 8. MVP FEATURE ROADMAP & RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════
  if (data.mvp) {
    renderSectionHeader('6. MVP Roadmap & Feature Prioritization', 'Minimum viable product scope, core features, and deferred capabilities')

    if (data.mvp.summary) {
      renderCalloutBox('MVP Strategy Summary', data.mvp.summary, colors.bgLight, colors.border, colors.primary)
    }

    if (data.mvp.features && data.mvp.features.length > 0) {
      const mvpFeatureRows = data.mvp.features.map((f) => [
        { content: f.feature, styles: { fontStyle: 'bold' as const, textColor: colors.primary } },
        { content: f.priority || 'High', styles: { fontStyle: 'bold' as const, halign: 'center' as const } },
        { content: f.marketFit || 'High', styles: { halign: 'center' as const } },
        { content: f.customerValue || 'High', styles: { halign: 'center' as const } },
        { content: f.resourceEffort || 'Medium', styles: { halign: 'center' as const } },
        { content: f.reason, styles: { textColor: colors.textBody } },
      ])

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Feature Name', 'Priority', 'Market Fit', 'Customer Value', 'Effort', 'Strategic Rationale']],
        body: mvpFeatureRows,
        theme: 'grid',
        headStyles: {
          fillColor: colors.primary,
          textColor: [255, 255, 255],
          fontSize: 7.8,
          fontStyle: 'bold',
          cellPadding: 2.5,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          lineColor: colors.border,
          lineWidth: 0.2,
        },
        columnStyles: {
          0: { cellWidth: 36 },
          1: { cellWidth: 16 },
          2: { cellWidth: 18 },
          3: { cellWidth: 20 },
          4: { cellWidth: 16 },
          5: { cellWidth: contentWidth - 106 },
        },
      })

      y = (doc.lastAutoTable?.finalY ?? y) + 4
    }

    // Deferred Features
    if (data.mvp.deferredFeatures && data.mvp.deferredFeatures.length > 0) {
      ensureSpace(12)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...colors.textMuted)
      doc.text('Post-MVP / Deferred Capabilities:', margin, y)
      y += 3.5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...colors.textBody)
      const defText = data.mvp.deferredFeatures.map((d) => `• ${d}`).join('   ')
      const defLines = doc.splitTextToSize(defText, contentWidth)
      doc.text(defLines, margin, y)
      y += defLines.length * 3.5 + 4
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 9. GO-TO-MARKET (GTM) STRATEGY
  // ═══════════════════════════════════════════════════════════════════
  if (data.goToMarketStrategy) {
    const gtm = data.goToMarketStrategy
    renderSectionHeader('7. Go-To-Market (GTM) Strategy', 'Customer acquisition channels, value proposition, and launch roadmap')

    const gtmOverviewRows = [
      [
        { content: 'Positioning Statement:', styles: { fontStyle: 'bold' as const, textColor: colors.primary } },
        { content: gtm.positioning || 'Targeted value proposition tailored to initial customer segment.' },
      ],
      [
        { content: 'Value Proposition:', styles: { fontStyle: 'bold' as const, textColor: colors.primary } },
        { content: gtm.valueProposition || 'High ROI with minimal onboarding friction.' },
      ],
      [
        { content: 'Pricing Strategy:', styles: { fontStyle: 'bold' as const, textColor: colors.primary } },
        { content: gtm.pricingStrategy || 'Tiered subscription model.' },
      ],
    ]

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: gtmOverviewRows,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.8,
        lineColor: colors.border,
        lineWidth: 0.2,
        textColor: colors.textBody,
      },
      columnStyles: {
        0: { cellWidth: 42, fillColor: colors.bgLight },
        1: { cellWidth: contentWidth - 42 },
      },
    })

    y = (doc.lastAutoTable?.finalY ?? y) + 4

    // Channels & Acquisition Strategy
    if (gtm.marketingChannels?.length || gtm.customerAcquisitionStrategy?.length) {
      const colWidth = contentWidth / 2 - 2

      const channelText = (gtm.marketingChannels || []).map((c) => `• ${c}`).join('\n')
      const acqText = (gtm.customerAcquisitionStrategy || []).map((a) => `• ${a}`).join('\n')

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Priority Marketing Channels', 'Customer Acquisition Steps']],
        body: [[channelText, acqText]],
        theme: 'grid',
        headStyles: {
          fillColor: colors.primary,
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          cellPadding: 2.5,
        },
        styles: {
          fontSize: 7.8,
          cellPadding: 2.8,
          lineColor: colors.border,
          lineWidth: 0.2,
          textColor: colors.textBody,
        },
        columnStyles: {
          0: { cellWidth: colWidth },
          1: { cellWidth: colWidth },
        },
      })

      y = (doc.lastAutoTable?.finalY ?? y) + 4
    }

    // Launch Plan & Next Steps
    if (gtm.launchPlan?.length || gtm.nextSteps?.length) {
      const colWidth = contentWidth / 2 - 2

      const launchText = (gtm.launchPlan || []).map((l, i) => `${i + 1}. ${l}`).join('\n')
      const nextText = (gtm.nextSteps || []).map((n, i) => `${i + 1}. ${n}`).join('\n')

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Phased Launch Plan', 'Immediate Next Steps (30-60 Days)']],
        body: [[launchText, nextText]],
        theme: 'grid',
        headStyles: {
          fillColor: colors.primary,
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          cellPadding: 2.5,
        },
        styles: {
          fontSize: 7.8,
          cellPadding: 2.8,
          lineColor: colors.border,
          lineWidth: 0.2,
          textColor: colors.textBody,
        },
        columnStyles: {
          0: { cellWidth: colWidth },
          1: { cellWidth: colWidth },
        },
      })

      y = (doc.lastAutoTable?.finalY ?? y) + 6
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 10. STRATEGIC RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════
  const recommendationsList =
    data.categorizedRecommendations && data.categorizedRecommendations.length > 0
      ? data.categorizedRecommendations
      : (data.recommendations || []).map((r) => ({
          category: 'Strategic' as const,
          priority: 'High' as const,
          impact: 'High Impact' as const,
          text: r,
          reasoning: undefined,
        }))

  if (recommendationsList.length > 0) {
    renderSectionHeader('8. Prioritized Recommendations & Action Plan', 'Actionable next steps to optimize unit economics, moat, and adoption')

    const recRows = recommendationsList.map((rec) => [
      {
        content: `${rec.category || 'Strategic'}\n(${rec.priority || 'High'})`,
        styles: { fontStyle: 'bold' as const, textColor: colors.primary, halign: 'center' as const },
      },
      {
        content: `${rec.text}${rec.reasoning ? `\n\nStrategic Rationale: ${rec.reasoning}` : ''}`,
        styles: { textColor: colors.textBody },
      },
    ])

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Category & Priority', 'Action Item & Execution Rationale']],
      body: recRows,
      theme: 'grid',
      headStyles: {
        fillColor: colors.primary,
        textColor: [255, 255, 255],
        fontSize: 8.2,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: colors.border,
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: contentWidth - 38 },
      },
    })

    y = (doc.lastAutoTable?.finalY ?? y) + 6
  }

  // ═══════════════════════════════════════════════════════════════════
  // 11. INVESTOR PERSPECTIVE & DUE DILIGENCE
  // ═══════════════════════════════════════════════════════════════════
  if (data.investorPerspective) {
    renderSectionHeader('9. Investor Perspective & Due Diligence', 'VC/Angel investment thesis, attractiveness drivers, and due-diligence concerns')

    if (data.investorPerspective.verdictLabel) {
      renderCalloutBox(
        'Investor Appetite Assessment',
        data.investorPerspective.verdictLabel,
        colors.accentLight,
        colors.accent,
        colors.accent
      )
    }

    if (data.investorPerspective.evidence?.length || data.investorPerspective.concerns?.length) {
      const colWidth = contentWidth / 2 - 2

      const evidenceText = (data.investorPerspective.evidence || []).map((e) => `• ${e}`).join('\n\n')
      const concernsText = (data.investorPerspective.concerns || []).map((c) => `• ${c}`).join('\n\n')

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Key Supporting Signals (Thesis)', 'Anticipated Investor Diligence Questions']],
        body: [[evidenceText, concernsText]],
        theme: 'grid',
        headStyles: {
          fillColor: colors.primary,
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          cellPadding: 2.5,
        },
        styles: {
          fontSize: 7.8,
          cellPadding: 2.8,
          lineColor: colors.border,
          lineWidth: 0.2,
          textColor: colors.textBody,
        },
        columnStyles: {
          0: { cellWidth: colWidth },
          1: { cellWidth: colWidth },
        },
      })

      y = (doc.lastAutoTable?.finalY ?? y) + 6
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 12. SOURCES & REFERENCES
  // ═══════════════════════════════════════════════════════════════════
  if (data.sources && data.sources.length > 0) {
    renderSectionHeader('10. Verified Research Sources & References', 'Live market benchmarks and citations consulted during analysis')

    data.sources.slice(0, 10).forEach((src) => {
      ensureSpace(5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...colors.accent)
      const lines = doc.splitTextToSize(src, contentWidth - 4)
      doc.text(lines, margin + 4, y)
      y += lines.length * 3.2 + 1
    })
    y += 4
  }

  // ═══════════════════════════════════════════════════════════════════
  // 13. RUNNING HEADERS & FOOTERS (PAGE X OF Y)
  // ═══════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Top Header (pages 2+)
    if (i > 1) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...colors.textMuted)
      doc.text(data.idea || 'Startup Validation Report', margin, 9)
      doc.text('AI Executive Intelligence Report', pageWidth - margin, 9, { align: 'right' })

      doc.setDrawColor(...colors.border)
      doc.setLineWidth(0.2)
      doc.line(margin, 11, pageWidth - margin, 11)
    }

    // Bottom Footer (all pages)
    doc.setDrawColor(...colors.border)
    doc.setLineWidth(0.2)
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...colors.textMuted)
    doc.text(
      'CONFIDENTIAL & PROPRIETARY — Generated via AI Startup Idea Validator',
      margin,
      pageHeight - 7
    )
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' })
  }

  // ═══════════════════════════════════════════════════════════════════
  // 14. SAVE & DOWNLOAD
  // ═══════════════════════════════════════════════════════════════════
  const sanitizedTitle = (data.idea || 'Startup_Validation_Report')
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
  const fileName = `${sanitizedTitle}_Validation_Report.pdf`

  doc.save(fileName)
}
