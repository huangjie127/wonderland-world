"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // 验证密码
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("密码长度至少6位");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data?.user) {
        // 如果用户已存在但未验证，或者新注册，都显示 OTP 输入框
        if (data.user.identities?.length === 0) {
           setError("该邮箱已被注册");
           setLoading(false);
           return;
        }
        
        setSuccess("验证邮件已发送！请在下方输入邮件中的 6 位数字验证码。");
        setShowOtpInput(true);
      }
    } catch (err) {
      setError(err.message || "注册失败，请重试");
      console.error("Signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });

      if (verifyError) throw verifyError;

      setSuccess("验证成功！正在跳转...");
      setTimeout(() => {
        router.push("/home");
      }, 1500);
    } catch (err) {
      setError(err.message || "验证失败，请检查验证码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl border border-white/50 shadow-xl w-full max-w-md relative z-10">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800 font-serif">创建账户</h1>
        <p className="text-center text-gray-600 mb-8">加入 Persona Archive</p>

        {showOtpInput ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
             {error && (
              <div className="bg-red-50/80 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50/80 border border-green-200 text-green-600 px-4 py-3 rounded">
                {success}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱验证码</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="请输入邮件中的6位数字"
                required
                className="w-full px-3 py-2 bg-white/60 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-center tracking-widest text-lg"
              />
              <p className="text-xs text-gray-500 mt-2">
                请查看您的邮箱 {email}，找到验证邮件中的数字验证码。
                <br/>
                (如果没收到，请检查垃圾箱，或修改 Supabase 邮件模板以包含 Token)
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600/90 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "验证中..." : "完成验证"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="bg-red-50/80 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50/80 border border-green-200 text-green-600 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-3 py-2 bg-white/60 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6位"
                required
                className="w-full px-3 py-2 bg-white/60 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 bg-white/60 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600/90 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "发送验证码" : "注册"}
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200/50">
          <p className="text-center text-gray-600 text-sm">
            已有账户？{" "}
            <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-700 font-semibold">
              去登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
