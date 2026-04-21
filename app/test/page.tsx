'use client';
import { useState } from 'react';

export default function TestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('대기 중...');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('파일을 먼저 선택해주세요!');
      return;
    }

    try {
      setStatus('1단계: 백엔드(NCP)에 일회용 열쇠 요청 중... 🔑');
      
      const apiUrl = process.env.NEXT_PUBLIC_NCP_API_URL;
      if (!apiUrl) throw new Error('NEXT_PUBLIC_NCP_API_URL 값이 없습니다.');

      // 깔끔해진 요청 코드 (이상한 주문 모두 삭제)
      const keyResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
        }),
      });

      // 웹 액션이 이제 정상적인 JSON을 뱉어냅니다!
      const keyData = await keyResponse.json();

      if (!keyData.success || !keyData.presignedUrl) {
        throw new Error('열쇠 발급 실패: ' + JSON.stringify(keyData));
      }

      setStatus('2단계: 발급받은 열쇠로 창고에 파일 직배송 중... 🚀');

      const uploadResponse = await fetch(keyData.presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (uploadResponse.ok) {
        setStatus('✅ 업로드 완벽 성공! NCP 창고를 확인해 보세요!');
        alert('Vercel 패스 직배송 성공!');
      } else {
        throw new Error(`업로드 실패: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

    } catch (error: any) {
      console.error(error);
      setStatus('❌ 에러 발생: ' + error.message);
    }
  };

  return (
    <div className="p-10 font-sans">
      <h1 className="text-2xl font-bold mb-4">무인 NAS 파일 직송 테스트 🚀</h1>
      <div className="mb-4 bg-gray-100 p-4 rounded inline-block border">
        <input type="file" onChange={handleFileChange} className="block w-full" />
      </div>
      <br />
      <button 
        onClick={handleUpload}
        className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition shadow-lg"
      >
        NCP 창고로 직배송 쏘기
      </button>
      <div className="mt-8 p-4 bg-yellow-50 rounded font-semibold text-gray-800 border-2 border-yellow-200">
        현재 상태: {status}
      </div>
    </div>
  );
}