import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    env_check: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      R2_ACCOUNT_ID: !!process.env.R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME, // 显示 Bucket 名称以便核对
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    },
    timestamp: new Date().toISOString(),
  });
}
