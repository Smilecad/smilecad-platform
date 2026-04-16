/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // ⭐ 서버리스를 위한 핵심 설정!
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;