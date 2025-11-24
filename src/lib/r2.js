import { S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
  // 在构建时或服务器启动时检查，避免运行时才报错
  console.error("❌ R2 Configuration Error: Missing environment variables.");
  console.error(`R2_ACCOUNT_ID: ${accountId ? "Set" : "Missing"}`);
  console.error(`R2_ACCESS_KEY_ID: ${accessKeyId ? "Set" : "Missing"}`);
  console.error(`R2_SECRET_ACCESS_KEY: ${secretAccessKey ? "Set" : "Missing"}`);
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
});
