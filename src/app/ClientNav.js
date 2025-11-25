"use client";

import Link from "next/link";
import { useAuth } from "./providers";
import { useRouter } from "next/navigation";

export default function ClientNav() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  if (!user) {
    return (
      <nav className="bg-white shadow-sm p-4 flex gap-4 justify-between items-center sticky top-0 z-50">
        <Link href="/" className="font-bold text-xl text-indigo-600 flex items-center gap-2">
          <span>🏰</span> OCBase
        </Link>
        <div className="flex gap-4">
          <Link href="/auth/login" className="font-semibold text-gray-600 hover:text-indigo-600">
            登录
          </Link>
          <Link href="/auth/signup" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
            注册
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm p-4 flex gap-4 justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link href="/home" className="font-bold text-xl text-indigo-600 flex items-center gap-2 mr-4">
          <span>🏰</span> OCBase
        </Link>
        <Link className="font-medium text-gray-600 hover:text-indigo-600" href="/home">
          我的世界
        </Link>
        <Link className="font-medium text-gray-600 hover:text-indigo-600" href="/archive">
          档案馆
        </Link>
        <Link className="font-medium text-gray-600 hover:text-indigo-600" href="/meet">
          奇遇（还在开发中）
        </Link>
        <Link className="font-medium text-gray-600 hover:text-indigo-600" href="/world">
          世界频道
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          退出
        </button>
      </div>
    </nav>
  );
}
