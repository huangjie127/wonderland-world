import { NextResponse } from 'next/server';

export async function GET() {
  // Use UTC+8 for consistency with the user's likely location (based on Chinese text)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const cst = new Date(utc + (3600000 * 8)); // UTC+8
  
  const hour = cst.getHours();
  
  let message = "欢迎来到世界频道，在这里畅所欲言吧！";
  let channel = "自由频道";
  
  if (hour >= 7 && hour < 9) {
    channel = "早餐频道";
    message = "早安！一日之计在于晨，今天早餐吃什么？";
  } else if (hour >= 11 && hour < 13) {
    channel = "午餐频道";
    message = "终于可以休息了！今天午餐吃什么？";
  } else if (hour >= 18 && hour < 20) {
    channel = "晚餐频道";
    message = "忙碌了一天辛苦了，今天晚餐吃什么？";
  } else if (hour >= 22 || hour < 5) {
    channel = "深夜频道";
    message = "夜深了，还有谁没睡？";
  }

  return NextResponse.json({
    message,
    current_channel: channel,
    server_time: cst.toISOString()
  });
}
