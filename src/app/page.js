import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pink-50 to-white pt-32 pb-32">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="animate-slide-up">
            <span className="inline-block py-1 px-3 rounded-full bg-pink-100 text-pink-500 text-sm font-semibold mb-6">
              ✨ 欢迎来到 OCBase
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6">
              你的原创角色
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-sky-400"> 在这里生活 </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              不仅仅是设定集。在这里，你可以赋予 OC 生命，记录他们的故事，
              与其他角色建立羁绊，共同编织一个无限扩展的宇宙。
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/auth/signup" 
                className="px-8 py-4 bg-white text-sky-400 border-2 border-sky-300 rounded-full font-bold text-lg hover:bg-sky-50 hover:border-sky-400 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                立即开始创造
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
          <div className="absolute top-20 right-10 w-72 h-72 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* Feature Grid - The "3 Seconds" Understanding */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 text-center hover:shadow-lg transition duration-300 border border-sky-100 group">
              <div className="w-20 h-20 bg-sky-100 text-sky-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 group-hover:scale-110 transition-transform">
                🎨
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">创建与展示</h3>
              <p className="text-gray-600 leading-relaxed">
                为你的 OC 建立专属档案。上传立绘、设定详细属性、性格标签，打造独一无二的角色名片。
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 text-center hover:shadow-lg transition duration-300 border border-purple-100 group">
              <div className="w-20 h-20 bg-purple-100 text-purple-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 group-hover:scale-110 transition-transform">
                📜
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">故事与时间线</h3>
              <p className="text-gray-600 leading-relaxed">
                记录角色的生平大事。通过时间轴串联起每一个重要时刻，让角色的成长轨迹清晰可见。
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 text-center hover:shadow-lg transition duration-300 border border-pink-100 group">
              <div className="w-20 h-20 bg-pink-100 text-pink-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 group-hover:scale-110 transition-transform">
                🤝
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">羁绊与互动</h3>
              <p className="text-gray-600 leading-relaxed">
                拒绝孤岛。与其他创作者的 OC 建立关系，发送互动请求，共同演绎跨越平行宇宙的故事。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Vibe Section */}
      <section className="py-24 bg-gradient-to-br from-sky-50 via-purple-50 to-pink-50 overflow-hidden relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#e0e7ff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-8 text-gray-800">
            加入一个充满想象力的社群
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            无论你是画师、写手，还是单纯的设定爱好者，OCBase 都是你存放梦想的避风港。
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {["🎭 角色扮演", "📝 设定交流", "🖼️ 约稿展示", "🎲 跑团记录", "✨ 灵感碰撞"].map((tag) => (
              <span key={tag} className="px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-gray-600 border border-pink-100 shadow-sm font-medium hover:bg-white transition cursor-default">
                {tag}
              </span>
            ))}
          </div>

          <Link 
            href="/auth/signup" 
            className="inline-block px-12 py-5 bg-gradient-to-r from-pink-400 to-sky-400 text-white rounded-full font-bold text-xl hover:from-pink-500 hover:to-sky-500 transition transform hover:scale-105 shadow-lg hover:shadow-pink-400/25"
          >
            免费加入 OCBase
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-6">
            <span className="text-2xl font-bold text-pink-400">OCBase</span>
          </div>
          <p className="text-gray-400">© 2025 OCBase. All Original Characters belong to their creators.</p>
        </div>
      </footer>
    </div>
  );
}
