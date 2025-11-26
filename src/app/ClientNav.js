"use client";

import Link from "next/link";
import { useAuth } from "./providers";
import { useRouter, usePathname } from "next/navigation";

export default function ClientNav() {
  const { user, logout, userProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  const isActive = (path) => pathname.startsWith(path);

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
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex bg-white shadow-sm p-4 gap-4 justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link href="/home" className="font-bold text-xl text-indigo-600 flex items-center gap-2 mr-4">
            <span>🏰</span> OCBase
          </Link>
          <Link className={`font-medium hover:text-indigo-600 ${isActive('/home') ? 'text-indigo-600' : 'text-gray-600'}`} href="/home">
            我的世界
          </Link>
          <Link className={`font-medium hover:text-indigo-600 ${isActive('/square') ? 'text-indigo-600' : 'text-gray-600'}`} href="/square">
            OC动态
          </Link>
          <Link className={`font-medium hover:text-indigo-600 ${isActive('/archive') ? 'text-indigo-600' : 'text-gray-600'}`} href="/archive">
            档案馆
          </Link>
          <Link className={`font-medium hover:text-indigo-600 ${isActive('/world') ? 'text-indigo-600' : 'text-gray-600'}`} href="/world">
            世界频道
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {userProfile && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-full border border-yellow-200">
              <span className="text-xs font-bold text-yellow-700">Lv.{userProfile.level || 1}</span>
              <span className="text-xs text-yellow-600">✨ {userProfile.points || 0}</span>
            </div>
          )}
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            退出
          </button>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <nav className="md:hidden bg-white shadow-sm px-4 py-3 flex justify-between items-center sticky top-0 z-50">
        <Link href="/home" className="font-bold text-lg text-indigo-600 flex items-center gap-2">
          <span>🏰</span> OCBase
        </Link>
        <div className="flex items-center gap-3">
            {userProfile && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 rounded-full border border-yellow-200">
                <span className="text-[10px] font-bold text-yellow-700">Lv.{userProfile.level || 1}</span>
                </div>
            )}
            <button
                onClick={handleLogout}
                className="text-xs text-gray-400 hover:text-red-600"
            >
                退出
            </button>
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          <Link href="/home" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/home') ? 'text-indigo-600' : 'text-gray-400'}`}>
            <span className="text-xl">🏰</span>
            <span className="text-[10px] font-medium">我的</span>
          </Link>
          <Link href="/square" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/square') ? 'text-indigo-600' : 'text-gray-400'}`}>
            <span className="text-xl">✨</span>
            <span className="text-[10px] font-medium">广场</span>
          </Link>
          <Link href="/archive" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/archive') ? 'text-indigo-600' : 'text-gray-400'}`}>
            <span className="text-xl">📚</span>
            <span className="text-[10px] font-medium">档案</span>
          </Link>
          <Link href="/world" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/world') ? 'text-indigo-600' : 'text-gray-400'}`}>
            <span className="text-xl">🌍</span>
            <span className="text-[10px] font-medium">世界</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
