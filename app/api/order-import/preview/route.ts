import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type ConfidenceLevel = 'high' | 'medium' | 'low'

type PreviewResult = {
  clinic_name: string
  patient_name: string
  gender: string
  birth_date: string
  product_type: string
  due_date: string
  phone: string
  address: string
  teeth: string
  request_note: string
  confidence: {
    clinic_name: ConfidenceLevel
    patient_name: ConfidenceLevel
    due_date: ConfidenceLevel
    product_type: ConfidenceLevel
    teeth: ConfidenceLevel
  }
}

type ClinicRule = {
  clinicKeywords: string[]
  preferredProducts?: Array<{ keyword: RegExp; value: string }>
  patientPatterns?: RegExp[]
  note?: string
}

const PRODUCT_DICTIONARY: Array<{ keyword: RegExp; value: string }> = [
  { keyword: /빅스트/i, value: '빅스트' },
  { keyword: /에티윈/i, value: '에티윈' },
  { keyword: /nt[\s-]?tainer/i, value: 'NT-TAINER' },
  { keyword: /retainer/i, value: 'RETAINER' },
  { keyword: /유지장치/i, value: '유지장치' },
  { keyword: /스플린트|splint/i, value: '스플린트' },
  { keyword: /교정장치/i, value: '교정장치' },
  { keyword: /스캔파일/i, value: '스캔파일 접수' },
]

const CLINIC_RULES: ClinicRule[] = [
  {
    clinicKeywords: ['마석 온아치과', '온아치과'],
    preferredProducts: [
      { keyword: /빅스트/i, value: '빅스트' },
      { keyword: /에티윈/i, value: '에티윈' },
    ],
    patientPatterns: [/([가-힣]{2,4})님/],
  },
  {
    clinicKeywords: ['롯덴치과'],
    preferredProducts: [
      { keyword: /에티윈/i, value: '에티윈' },
      { keyword: /스캔파일/i, value: '스캔파일 접수' },
    ],
    patientPatterns: [/([가-힣]{2,4})님/],
  },
]

function matchFirst(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const matched = text.match(pattern)
    if (matched?.[1]) {
      return matched[1].trim()
    }
  }
  return ''
}

function normalizeWhitespace(text: string) {
  return text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeDate(value: string) {
  let cleaned = value.trim()

  cleaned = cleaned.replace(/년/g, '-')
  cleaned = cleaned.replace(/월/g, '-')
  cleaned = cleaned.replace(/일/g, '')
  cleaned = cleaned.replace(/\./g, '-')
  cleaned = cleaned.replace(/\//g, '-')

  const parts = cleaned
    .split('-')
    .map((v) => v.trim())
    .filter(Boolean)

  if (parts.length === 3) {
    let [y, m, d] = parts

    if (y.length === 2) {
      y = `20${y}`
    }

    if (y.length === 4) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }

  return ''
}

function normalizeMonthDayToCurrentYear(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/\s+/g, '')
    .replace(/월/g, '-')
    .replace(/일/g, '')

  const parts = cleaned.split('-').filter(Boolean)
  if (parts.length !== 2) return ''

  const [m, d] = parts
  const now = new Date()
  const year = now.getFullYear()

  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseDateCandidate(text: string) {
  const raw = matchFirst(text, [
    /([12][0-9]{3}[./-][01]?[0-9][./-][0-3]?[0-9])/,
    /(\d{2}[./-]\d{1,2}[./-]\d{1,2}(?:일)?)/,
  ])

  if (!raw) return ''
  return normalizeDate(raw)
}

function isWithinOneYear(dateText: string) {
  if (!dateText) return false

  const target = new Date(dateText)
  if (Number.isNaN(target.getTime())) return false

  const now = new Date()
  const diff = Math.abs(now.getTime() - target.getTime())
  const oneYearMs = 1000 * 60 * 60 * 24 * 365

  return diff <= oneYearMs
}

function detectClinicRule(text: string) {
  const normalized = normalizeWhitespace(text)

  return (
    CLINIC_RULES.find((rule) =>
      rule.clinicKeywords.some((keyword) => normalized.includes(keyword))
    ) || null
  )
}

function extractClinicName(text: string) {
  return matchFirst(text, [
    /\[([^\]]+치과)\]/i,
    /치과명[:\s]+(.+)/i,
    /병원명[:\s]+(.+)/i,
    /^([가-힣A-Za-z0-9()\s]+치과)$/m,
    /([가-힣A-Za-z0-9\s]+치과)/,
  ])
}

function extractPatientAndProduct(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines) {
    const normalized = line.replace(/\s+/g, ' ').trim()

    if (/tainer/i.test(normalized)) {
      const nameMatch = normalized.match(/^([가-힣]{2,4})\s+/)
      if (nameMatch) {
        return {
          patient: nameMatch[1],
          product: 'NT-TAINER',
        }
      }
    }

    if (/유지장치/.test(normalized)) {
      const nameMatch = normalized.match(/^([가-힣]{2,4})\s+/)
      if (nameMatch) {
        return {
          patient: nameMatch[1],
          product: '유지장치',
        }
      }
    }
  }

  return {
    patient: '',
    product: '',
  }
}

function extractPatientName(text: string, clinicRule: ClinicRule | null) {
  if (clinicRule?.patientPatterns?.length) {
    const clinicPatient = matchFirst(text, clinicRule.patientPatterns)
    if (clinicPatient) return clinicPatient
  }

  return matchFirst(text, [
    /환자명[:\s]+(.+)/i,
    /환자[:\s]+([가-힣]{2,4})/i,
    /([가-힣]{2,4})님/,
    /\]?\s*([가-힣]{2,4})\s*환자/i,
    /^([가-힣]{2,4})$/m,
  ])
}

function extractGender(text: string) {
  if (/성별[:\s]*남|\/\s*남\b|남자/.test(text)) return '남'
  if (/성별[:\s]*여|\/\s*여\b|여자/.test(text)) return '여'
  return ''
}

function extractBirthDate(text: string) {
  const explicitBirth = matchFirst(text, [
    /생년월일[:\s]+([0-9./-]+)/i,
    /출생[:\s]+([0-9./-]+)/i,
    /dob[:\s]+([0-9./-]+)/i,
    /birth[:\s]+([0-9./-]+)/i,
  ])

  if (!explicitBirth) return ''

  return normalizeDate(explicitBirth)
}

function extractDueDate(text: string) {
  const explicitDue = matchFirst(text, [
    /납기일[:\s]+([0-9./-]+(?:일)?)/i,
    /납기[:\s]+([0-9./-]+(?:일)?)/i,
    /마감[:\s]+([0-9./-]+(?:일)?)/i,
    /도착\s*날짜는?\s*([0-9./-]+(?:일)?)/i,
    /도착[:\s]+([0-9./-]+(?:일)?)/i,
    /까지[:\s]*([0-9./-]+(?:일)?)/i,
  ])

  if (explicitDue) {
    return normalizeDate(explicitDue)
  }

  const monthDay = matchFirst(text, [/(\d{1,2}\s*월\s*\d{1,2}\s*일)/])

  if (monthDay) {
    return normalizeMonthDayToCurrentYear(monthDay)
  }

  const candidate = parseDateCandidate(text)
  if (candidate && isWithinOneYear(candidate)) {
    return candidate
  }

  return ''
}

function extractPhone(text: string) {
  return matchFirst(text, [
    /(01[0-9]-?\d{3,4}-?\d{4})/,
    /(0[2-9]\d?-?\d{3,4}-?\d{4})/,
  ])
}

function extractAddress(text: string) {
  return matchFirst(text, [
    /주소[:\s]+(.+)/i,
    /배송지[:\s]+(.+)/i,
    /수취인주소[:\s]+(.+)/i,
    /(서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)[^\n]+/,
  ])
}

function extractProductType(text: string, clinicRule: ClinicRule | null) {
  if (clinicRule?.preferredProducts?.length) {
    for (const item of clinicRule.preferredProducts) {
      if (item.keyword.test(text)) return item.value
    }
  }

  for (const item of PRODUCT_DICTIONARY) {
    if (item.keyword.test(text)) return item.value
  }

  if (/상악.*하악/.test(text)) return '상악/하악 유지장치'

  return matchFirst(text, [/제품[:\s]+(.+)/i, /재료[:\s]+(.+)/i])
}

function expandUpperRange(value: number) {
  return `${10 + value}~${20 + value}`
}

function expandLowerRange(value: number) {
  return `${30 + value}~${40 + value}`
}

function extractArchRangeTeeth(text: string) {
  const normalized = text.replace(/\s+/g, '')

  const bothMatch = normalized.match(/(상하악|상,하악|상악,하악|상악하악)(\d)-(\d)/)
  if (bothMatch) {
    const start = Number(bothMatch[2])
    const end = Number(bothMatch[3])

    if (start === end && start >= 1 && start <= 8) {
      return `${expandUpperRange(start)}, ${expandLowerRange(start)}`
    }

    if (start >= 1 && end >= 1 && start <= 8 && end <= 8) {
      return `${10 + start}~${20 + end}, ${30 + start}~${40 + end}`
    }
  }

  const upperMatch = normalized.match(/(상악|상)(\d)-(\d)/)
  if (upperMatch) {
    const start = Number(upperMatch[2])
    const end = Number(upperMatch[3])

    if (start === end && start >= 1 && start <= 8) {
      return expandUpperRange(start)
    }

    if (start >= 1 && end >= 1 && start <= 8 && end <= 8) {
      return `${10 + start}~${20 + end}`
    }
  }

  const lowerMatch = normalized.match(/(하악|하)(\d)-(\d)/)
  if (lowerMatch) {
    const start = Number(lowerMatch[2])
    const end = Number(lowerMatch[3])

    if (start === end && start >= 1 && start <= 8) {
      return expandLowerRange(start)
    }

    if (start >= 1 && end >= 1 && start <= 8 && end <= 8) {
      return `${30 + start}~${40 + end}`
    }
  }

  return ''
}

function extractRawTeeth(text: string) {
  const rangeMatches = text.match(/#?\d{2}\s*[-~]\s*\d{2}/g) || []
  const pairMatches = text.match(/#?\d{2}[,\s]+#?\d{2}/g) || []

  const merged = [...rangeMatches, ...pairMatches]
    .map((item) => item.replace(/\s+/g, '').replace(/#/g, ''))
    .filter(Boolean)

  if (!merged.length) return ''
  return Array.from(new Set(merged)).join(', ')
}

function extractTeeth(text: string) {
  const expanded = extractArchRangeTeeth(text)
  if (expanded) return expanded

  return extractRawTeeth(text)
}

function extractRequestNote(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.slice(0, 8).join('\n')
}

function confidence(value: string): ConfidenceLevel {
  if (!value) return 'low'
  if (value.length >= 2) return 'high'
  return 'medium'
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const text = typeof body.text === 'string' ? body.text : ''

    if (!text.trim()) {
      return NextResponse.json(
        { error: '텍스트가 비어 있습니다.' },
        { status: 400 }
      )
    }

    const clinicRule = detectClinicRule(text)
    const combined = extractPatientAndProduct(text)

    const clinic_name = extractClinicName(text)
    const patient_name = combined.patient || extractPatientName(text, clinicRule)
    const gender = extractGender(text)
    const birth_date = extractBirthDate(text)
    const product_type = combined.product || extractProductType(text, clinicRule)
    const due_date = extractDueDate(text)
    const phone = extractPhone(text)
    const address = extractAddress(text)
    const teeth = extractTeeth(text)
    const request_note = extractRequestNote(text)

    const result: PreviewResult = {
      clinic_name,
      patient_name,
      gender,
      birth_date,
      product_type,
      due_date,
      phone,
      address,
      teeth,
      request_note,
      confidence: {
        clinic_name: confidence(clinic_name),
        patient_name: confidence(patient_name),
        due_date: confidence(due_date),
        product_type: confidence(product_type),
        teeth: confidence(teeth),
      },
    }

    return NextResponse.json({
      success: true,
      result,
      debug: {
        matched_clinic_rule: clinicRule?.clinicKeywords?.[0] || '',
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '주문 초안 추출 중 오류가 발생했습니다.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}