// app/components/AppTopNav.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type NavItem = {
  name: string
  path: string
  id: string
  adminOnly?: boolean
}

type PushButtonStatus =
  | 'checking'
  | 'unsupported'
  | 'missing-key'
  | 'default'
  | 'denied'
  | 'subscribing'
  | 'enabled'
  | 'error'

const SAVE_PUSH_SUBSCRIPTION_API_URL =
  process.env.NEXT_PUBLIC_NCP_SAVE_PUSH_SUBSCRIPTION_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/save-push-subscription'

const WEB_PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

function getPushButtonLabel(status: PushButtonStatus) {
  if (status === 'checking') return '알림 확인'
  if (status === 'unsupported') return '알림 미지원'
  if (status === 'missing-key') return '알림 설정 필요'
  if (status === 'denied') return '알림 차단됨'
  if (status === 'subscribing') return '알림 등록중'
  if (status === 'enabled') return '알림 켜짐'
  if (status === 'error') return '알림 재시도'
  return '알림 허용'
}

function getPushButtonTitle(status: PushButtonStatus) {
  if (status === 'unsupported') return '현재 브라우저는 푸시 알림을 지원하지 않습니다.'
  if (status === 'missing-key') return 'Vercel 환경변수 NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY가 필요합니다.'
  if (status === 'denied') return '브라우저에서 알림이 차단되어 있습니다. 사이트 설정에서 알림을 허용해주세요.'
  if (status === 'enabled') return '이 브라우저는 스마일캐드 알림을 받을 수 있습니다.'
  return '스마일캐드 주문/확인서 알림을 이 브라우저에서 받습니다.'
}

function PushIcon({ enabled }: { enabled?: boolean }) {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="M12 22a2.6 2.6 0 0 0 2.45-1.75h-4.9A2.6 2.6 0 0 0 12 22Z"
          fill="currentColor"
        />
        <path
          d="M19.2 17.1 17.8 15.4V10a5.8 5.8 0 0 0-4.35-5.6V3.8a1.45 1.45 0 0 0-2.9 0v.6A5.8 5.8 0 0 0 6.2 10v5.4l-1.4 1.7A1.2 1.2 0 0 0 5.72 19h12.56a1.2 1.2 0 0 0 .92-1.9Z"
          fill="currentColor"
        />
      </svg>
      {enabled && (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
      )}
    </span>
  )
}

export default function AppTopNav({ current }: { current?: string }) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [pushStatus, setPushStatus] = useState<PushButtonStatus>('checking')

  useEffect(() => {
    try {
      const savedUser = window.localStorage.getItem('smilecad_user')
      const user = savedUser ? JSON.parse(savedUser) : null
      setIsAdmin(String(user?.role || '').toLowerCase() === 'admin')
    } catch {
      setIsAdmin(false)
    }
  }, [])

  useEffect(() => {
    async function checkPushStatus() {
      try {
        if (typeof window === 'undefined') return

        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
          setPushStatus('unsupported')
          return
        }

        if (!WEB_PUSH_PUBLIC_KEY) {
          setPushStatus('missing-key')
          return
        }

        if (Notification.permission === 'denied') {
          setPushStatus('denied')
          return
        }

        if (Notification.permission === 'granted') {
          const registration = await navigator.serviceWorker.register('/sw.js')
          const subscription = await registration.pushManager.getSubscription()
          setPushStatus(subscription ? 'enabled' : 'default')
          return
        }

        setPushStatus('default')
      } catch (error) {
        console.error('푸시 알림 상태 확인 실패:', error)
        setPushStatus('error')
      }
    }

    checkPushStatus()
  }, [])

  const navItems: NavItem[] = useMemo(
    () => [
      { name: '대시보드', path: '/dashboard', id: 'dashboard' },
      { name: '주문 목록', path: '/orders', id: 'orders' },
      { name: '명세서', path: '/billing', id: 'billing' },
      { name: '회원정보 수정', path: '/profile', id: 'profile' },
      { name: '치과 회원목록', path: '/admin/clinics', id: 'admin-clinics', adminOnly: true },
      { name: '확인서 관리', path: '/admin/confirmations', id: 'admin-confirmations', adminOnly: true },
      { name: '활동 로그', path: '/admin/activity-logs', id: 'admin-activity-logs', adminOnly: true },
      { name: '문의하기', path: '/inquiry', id: 'inquiry' },
    ],
    []
  )

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly) return isAdmin
    return true
  })

  const handleLogout = () => {
    window.localStorage.removeItem('smilecad_token')
    window.localStorage.removeItem('smilecad_user')
    router.replace('/login')
  }

  const isActive = (item: { id: string; path: string }) => {
    return current === item.id || current === item.path.substring(1)
  }

  const arrayBufferToBase64Url = (buffer: ArrayBuffer | null) => {
    if (!buffer) return ''

    const bytes = new Uint8Array(buffer)
    let binary = ''

    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i])
    }

    return window
      .btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
  }

  const saveSubscription = async (subscription: PushSubscription) => {
    const token = window.localStorage.getItem('smilecad_token')

    if (!token) {
      router.replace('/login?force=1')
      return
    }

    const jsonSubscription = subscription.toJSON() as {
      endpoint?: string
      expirationTime?: number | null
      keys?: {
        p256dh?: string
        auth?: string
      }
    }

    const endpoint = subscription.endpoint || jsonSubscription.endpoint || ''
    const p256dh =
      jsonSubscription.keys?.p256dh || arrayBufferToBase64Url(subscription.getKey('p256dh'))
    const auth = jsonSubscription.keys?.auth || arrayBufferToBase64Url(subscription.getKey('auth'))

    if (!endpoint || !p256dh || !auth) {
      console.error('푸시 구독 정보 생성 실패:', {
        hasEndpoint: Boolean(endpoint),
        hasP256dh: Boolean(p256dh),
        hasAuth: Boolean(auth),
        jsonSubscription,
      })
      throw new Error('브라우저 푸시 구독 정보를 생성하지 못했습니다.')
    }

    const response = await fetch(SAVE_PUSH_SUBSCRIPTION_API_URL, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint,
        p256dh,
        auth,
        keys: {
          p256dh,
          auth,
        },
        subscription: {
          endpoint,
          expirationTime: jsonSubscription.expirationTime || null,
          keys: {
            p256dh,
            auth,
          },
        },
        userAgent: window.navigator.userAgent,
        platform: window.navigator.platform || '',
      }),
    })

    const text = await response.text()
    let data: { success?: boolean; error?: string } | null = null

    try {
      data = text ? JSON.parse(text) : null
    } catch (error) {
      console.error('save-push-subscription JSON 파싱 실패:', text, error)
      throw new Error('알림 구독 저장 응답을 처리할 수 없습니다.')
    }

    if (response.status === 401 || response.status === 403) {
      window.localStorage.removeItem('smilecad_token')
      window.localStorage.removeItem('smilecad_user')
      router.replace('/login?force=1')
      return
    }

    if (!response.ok || !data?.success) {
      throw new Error(data?.error || '알림 구독 정보를 저장하지 못했습니다.')
    }
  }

  const handleEnablePush = async () => {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus('unsupported')
        alert('현재 브라우저는 푸시 알림을 지원하지 않습니다.')
        return
      }

      if (!WEB_PUSH_PUBLIC_KEY) {
        setPushStatus('missing-key')
        alert('Vercel 환경변수 NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY가 설정되지 않았습니다.')
        return
      }

      if (Notification.permission === 'denied') {
        setPushStatus('denied')
        alert('브라우저에서 알림이 차단되어 있습니다. 주소창 왼쪽 사이트 설정에서 알림을 허용해주세요.')
        return
      }

      setPushStatus('subscribing')

      const permission =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission()

      if (permission !== 'granted') {
        setPushStatus(permission === 'denied' ? 'denied' : 'default')
        return
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(WEB_PUSH_PUBLIC_KEY),
        })
      }

      await saveSubscription(subscription)
      setPushStatus('enabled')
      alert('알림이 켜졌습니다. 이제 이 브라우저에서 스마일캐드 알림을 받을 수 있습니다.')
    } catch (error) {
      console.error('푸시 알림 등록 실패:', error)
      setPushStatus('error')
      alert('알림 등록 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <header className="mb-8 rounded-[26px] border border-[#e5eaf2] bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] sm:px-7 sm:py-5 lg:mb-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          onClick={() => router.push('/orders')}
          className="flex items-center gap-3 text-left"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.24)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path
                d="M12 21C12 21 18 15.8 18 9.8C18 6.5 15.3 4 12 4C8.7 4 6 6.5 6 9.8C6 15.8 12 21 12 21Z"
                fill="currentColor"
              />
              <circle cx="12" cy="9.8" r="2.2" fill="white" opacity="0.9" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="whitespace-nowrap text-[23px] font-black leading-none tracking-[-0.04em] text-[#111827] sm:text-[26px]">
              SmileCAD
              <span className="ml-1 text-[14px] font-black text-[#94a3b8] sm:text-[16px]">
                Platform
              </span>
            </div>
          </div>
        </button>

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center lg:justify-end">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(item.path)}
              className={`min-h-[42px] rounded-[14px] px-4 py-2 text-[14px] font-black transition-all ${
                isActive(item)
                  ? 'bg-[#1e293b] text-white shadow-md'
                  : 'border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc] hover:text-[#1e293b]'
              }`}
            >
              {item.name}
            </button>
          ))}

          <button
            type="button"
            onClick={handleEnablePush}
            disabled={pushStatus === 'checking' || pushStatus === 'subscribing' || pushStatus === 'unsupported'}
            title={getPushButtonTitle(pushStatus)}
            className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-[14px] px-4 py-2 text-[14px] font-black transition-all ${
              pushStatus === 'enabled'
                ? 'border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : pushStatus === 'denied' || pushStatus === 'error' || pushStatus === 'missing-key'
                  ? 'border border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border border-[#dbeafe] bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe]'
            } ${
              pushStatus === 'checking' || pushStatus === 'subscribing' || pushStatus === 'unsupported'
                ? 'cursor-not-allowed opacity-70'
                : ''
            }`}
          >
            <PushIcon enabled={pushStatus === 'enabled'} />
            {getPushButtonLabel(pushStatus)}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="min-h-[42px] rounded-[14px] border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] font-black text-[#64748b] transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 sm:col-span-1"
          >
            로그아웃
          </button>
        </nav>
      </div>
    </header>
  )
}
