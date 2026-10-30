/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@licitabot/shared"],
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    if (api.startsWith("/")) return [];
    return [];
  },
};
export default nextConfig;
