import { NextRequest, NextResponse } from 'next/server'

function extractTagValue(xml: string, tagName: string) {
  const match = xml.match(new RegExp(`<${tagName}>(.*?)</${tagName}>`))
  return match?.[1]?.trim() ?? ''
}

function parseHolidayXml(xml: string) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]

  return items
    .map((item) => {
      const chunk = item[1]
      const locdate = extractTagValue(chunk, 'locdate')
      const isHoliday = extractTagValue(chunk, 'isHoliday')
      const dateName = extractTagValue(chunk, 'dateName')

      return {
        locdate,
        isHoliday,
        dateName,
      }
    })
    .filter((item) => item.isHoliday === 'Y' && item.locdate)
}

export async function GET(request: NextRequest) {
  try {
    const serviceKey = process.env.HOLIDAY_API_SERVICE_KEY

    if (!serviceKey) {
      return NextResponse.json(
        { error: 'HOLIDAY_API_SERVICE_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

    if (!year || !/^\d{4}$/.test(year)) {
      return NextResponse.json(
        { error: 'year 파라미터가 필요합니다. 예: ?year=2026' },
        { status: 400 }
      )
    }

    const url = new URL(
      'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo'
    )

    url.searchParams.set('serviceKey', serviceKey)
    url.searchParams.set('solYear', year)
    url.searchParams.set('numOfRows', '100')
    url.searchParams.set('_type', 'xml')

    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
    })

    const xml = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { error: '공휴일 API 호출에 실패했습니다.', detail: xml },
        { status: 502 }
      )
    }

    const holidays = parseHolidayXml(xml).map((item) => ({
      date: item.locdate, // YYYYMMDD
      name: item.dateName,
    }))

    return NextResponse.json({
      year,
      holidays,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '공휴일 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}