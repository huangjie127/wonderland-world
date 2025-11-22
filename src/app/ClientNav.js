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
      <nav className="bg-gray-100 p-4 flex gap-4 justify-between items-center">
        <div className="font-semibold text-lg">Persona Archive</div>
        <div className="flex gap-4">
          <Link href="/auth/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            登录
          </Link>
          <Link href="/auth/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">
            注册
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gray-100 p-4 flex gap-4 justify-between items-center">
      <div className="flex gap-4">
        <Link className="font-semibold" href="/home">
          创建角色
        </Link>
        <Link className="font-semibold" href="/archive">
          档案馆
        </Link>
        <Link className="font-semibold" href="/meet">
          奇遇 (Meet)
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          退出登录
        </button>
      </div>
    </nav>
  );
}
