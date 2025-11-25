import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "@/lib/r2";
import { NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const watermarkText = formData.get("watermarkText") || "OCBase";

    if (!file) {
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. 处理图片：调整大小 + 添加水印
    const processedImageBuffer = await sharp(buffer)
      .resize(1080, null, { // 限制宽度为 1080px，高度自适应
        withoutEnlargement: true, // 如果原图小于 1080px，不放大
        fit: 'inside'
      })
      .composite([
        {
          input: Buffer.from(
            `<svg width="500" height="100">
              <style>
                .title { fill: rgba(255, 255, 255, 0.5); font-size: 40px; font-weight: bold; font-family: sans-serif; }
              </style>
              <text x="50%" y="50%" text-anchor="middle" class="title">${watermarkText}</text>
            </svg>`
          ),
          gravity: 'southeast', // 水印位置：右下角
          blend: 'over'
        }
      ])
      .jpeg({ quality: 85 }) // 转换为 JPEG，质量 85
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
