import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't advertise the framework in an `X-Powered-By` response header.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Razorpay Checkout runs in a frame/popup it opens itself; camera/mic/location are never needed.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // A Content-Security-Policy is still to do: it has to allow Razorpay Checkout (script + frame),
          // Google Maps and Cloudinary, and should be verified in a real browser first.
        ],
      },
    ];
  },
};

export default nextConfig;
