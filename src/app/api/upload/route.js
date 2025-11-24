import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "@/lib/r2";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Missing filename or contentType" },
        { status: 400 }
      );
    }

    // Debug: Check environment variables
    const debugInfo = {
      hasAccountId: !!process.env.R2_ACCOUNT_ID,
      hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
      bucket: process.env.R2_BUCKET_NAME,
    };
    console.log("Upload Debug Info:", debugInfo);

    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error("Missing R2 credentials in environment variables");
    }

    // Generate a unique filename
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFilename,
      ContentType: contentType,
    });

    // Generate presigned URL
    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

    // Construct public URL (assuming you have a custom domain or use R2.dev)
    // If using custom domain: https://assets.yourdomain.com/filename
    // If using R2.dev: https://pub-<hash>.r2.dev/filename
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${uniqueFilename}`;

    return NextResponse.json({
      uploadUrl: signedUrl,
      publicUrl: publicUrl,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL: " + error.message },
      { status: 500 }
    );
  }
}
