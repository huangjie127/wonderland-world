import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "@/lib/r2";
import { NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    let watermarkText = formData.get("watermarkText") || "OCBase";

    console.log("Received watermark text:", watermarkText);

    // Ensure it starts with OCBase if somehow missing (unless it's just OCBase)
    if (!watermarkText.startsWith("OCBase") && watermarkText !== "OCBase") {
        // Force prefix if user wants "OCBase + Name" strictly
        watermarkText = `OCBase ${watermarkText}`;
    }

    // Escape XML special characters to prevent SVG breakage
    const escapedWatermarkText = watermarkText.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });

    if (!file) {
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Resize first to get consistent dimensions
    // Improved watermark logic: dynamic sizing and shadow
    const resizedBuffer = await sharp(buffer)
      .resize(1080, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .toBuffer();

    const metadata = await sharp(resizedBuffer).metadata();
    const width = metadata.width;
    const height = metadata.height;

    // Calculate font size based on image width (e.g., 4% of width)
    const fontSize = Math.max(20, Math.floor(width * 0.04));
    const margin = Math.floor(fontSize * 0.5);
    
    // Create SVG with text shadow for better visibility
    // Using inline attributes to avoid any CSS parsing issues in sharp/librsvg
    const svgImage = `
      <svg width="${width}" height="${height}">
        <!-- Shadow Layer -->
        <text 
          x="${width - margin + 2}" 
          y="${height - margin + 2}" 
          text-anchor="end" 
          font-size="${fontSize}" 
          font-weight="bold" 
          font-family="Microsoft YaHei, SimHei, PingFang SC, sans-serif"
          fill="#000000" 
          fill-opacity="0.8"
        >${escapedWatermarkText}</text>
        <!-- Main Text Layer -->
        <text 
          x="${width - margin}" 
          y="${height - margin}" 
          text-anchor="end" 
          font-size="${fontSize}" 
          font-weight="bold" 
          font-family="Microsoft YaHei, SimHei, PingFang SC, sans-serif"
          fill="#FFFFFF" 
          fill-opacity="0.9"
        >${escapedWatermarkText}</text>
      </svg>
    `;

    // 2. Composite watermark
    const processedImageBuffer = await sharp(resizedBuffer)
      .composite([
        {
          input: Buffer.from(svgImage),
          top: 0,
          left: 0,
          blend: 'over'
        }
      ])
      .jpeg({ quality: 85 })
      .toBuffer();

    // 2. 生成唯一文件名
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`;

    // 3. 上传处理后的图片到 R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFilename,
      ContentType: "image/jpeg",
      Body: processedImageBuffer, // 直接上传 Buffer
    });

    // 注意：这里不再使用预签名 URL 让前端上传，而是由后端直接上传处理后的图片
    // 因为我们需要在后端处理图片（加水印），所以前端必须把文件传给后端
    await r2.send(command);

    // 4. 构建公开访问 URL
    if (!process.env.R2_PUBLIC_URL) {
      throw new Error("Server configuration error: R2_PUBLIC_URL is missing");
    }
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${uniqueFilename}`;

    return NextResponse.json({
      publicUrl: publicUrl,
    });

  } catch (error) {
    console.error("Error processing/uploading image:", error);
    return NextResponse.json(
      { error: "Failed to process/upload image: " + error.message },
      { status: 500 }
    );
  }
}
