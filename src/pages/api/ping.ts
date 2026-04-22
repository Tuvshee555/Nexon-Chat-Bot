import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  // Simple deployment smoke test for webhook debugging.
  return res.status(200).json({
    ok: true,
    now: new Date().toISOString(),
    vercel: Boolean(process.env.VERCEL),
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
    sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
  });
}

