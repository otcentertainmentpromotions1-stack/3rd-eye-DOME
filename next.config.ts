import type {NextConfig} from 'next';

// The Base44 sandbox preview reaches the dev server through a proxy on the
// public host, so Next must accept that origin for dev assets/HMR. Only applied
// in the sandbox (BASE44_PREVIEW_MODE === "1"); otherwise the option is unset.
const sandboxDevOrigins =
  process.env.BASE44_PREVIEW_MODE === '1' && process.env.BASE44_PUBLIC_HOST_SUFFIX
    ? [`3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`]
    : [];

const nextConfig: NextConfig = {
  ...(sandboxDevOrigins.length ? {allowedDevOrigins: sandboxDevOrigins} : {}),
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
