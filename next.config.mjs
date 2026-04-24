/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/webhook/portal-mfa',
        destination: '/portal-mfa',
        permanent: false,
      },
      {
        source: '/webhook/consentimiento',
        destination: '/consentimiento',
        permanent: false,
      },
      {
        source: '/portal_mfa',
        destination: '/portal-mfa',
        permanent: false,
      }
    ];
  },
};

export default nextConfig;
