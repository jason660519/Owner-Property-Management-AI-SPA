export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      {/* Header Section */}
      <header className="bg-[#2A2A2A] border-b border-[#333333]">
        {/* Top Banner */}
        <div className="border-b border-[#333333] bg-[#2A2A2A] py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Abstract Design Icon Placeholder */}
              <div className="w-4 h-4 bg-purple-500 rounded-full" />
              <p className="text-sm text-white">✨你的AI好幫手，輕鬆管理你的不動產</p>
            </div>
            <button className="text-sm text-white hover:text-gray-300 flex items-center gap-1">
              學習更多
              <span className="bg-purple-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">→</span>
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
               {/* Logo Placeholder */}
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold">R</div>
              <span className="text-xl font-bold">RESA AI</span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-6 bg-[#1A1A1A] px-6 py-2 rounded-xl border border-[#333333]">
              <a href="#" className="text-white text-sm hover:text-purple-400">首頁</a>
              <a href="#" className="text-white text-sm hover:text-purple-400">關於我們</a>
              <a href="#" className="text-white text-sm hover:text-purple-400">我的物業</a>
              <a href="#" className="text-white text-sm hover:text-purple-400">服務</a>
            </div>

            {/* Contact Button */}
            <button className="bg-[#1A1A1A] border border-[#333333] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#333333]">
              聯絡我們
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column: Hero Text */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold leading-tight text-white">
                我的啞巴兒子
              </h1>
              <p className="text-lg text-gray-400">
                免仲介服務費，我的AI好幫手，輕鬆幫我管理物業，租客，部落格
              </p>
              {/* Abstract Design Placeholder */}
              <div className="w-24 h-2 bg-purple-500 rounded-full opacity-50"></div>
            </div>
            
            <div>
              <button className="bg-[#2A2A2A] border border-[#333333] text-white px-6 py-3 rounded-lg hover:bg-[#333333] transition-colors">
                我的所有物業
              </button>
            </div>
          </div>

          {/* Right Column: Property Cards */}
          <div className="space-y-6">
            
            {/* Card 1 */}
            <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4 hover:border-purple-500 transition-colors">
              <div className="relative h-48 w-full bg-gray-700 rounded-lg mb-4 overflow-hidden">
                {/* Image Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">Property Image</div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">我要如何與 AI 聯絡</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">
                    寬敞四房，容納全家夢想 — 東區優質生活，就此展開....「查看詳情」
                  </p>
                </div>

                {/* Features Tags */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-[#2A2A2A] border border-[#333333] rounded-full text-xs text-white flex items-center gap-1">
                    🏠 4-房
                  </span>
                  <span className="px-3 py-1 bg-[#2A2A2A] border border-[#333333] rounded-full text-xs text-white flex items-center gap-1">
                    🚿 3-衛浴
                  </span>
                  <span className="px-3 py-1 bg-[#2A2A2A] border border-[#333333] rounded-full text-xs text-white flex items-center gap-1">
                    🛗 電梯華夏
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#333333]">
                  <div>
                    <p className="text-xs text-gray-400">Price</p>
                    <p className="text-xl font-bold text-white">$550,000</p>
                  </div>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">
                    查詢物業部落格
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4 hover:border-purple-500 transition-colors">
              <div className="relative h-48 w-full bg-gray-700 rounded-lg mb-4 overflow-hidden">
                 {/* Image Placeholder */}
                 <div className="absolute inset-0 flex items-center justify-center text-gray-500">Property Image</div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Metropolitan Haven</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">
                    A chic and fully-furnished 2-bedroom apartment with panoramic city views... Read More
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-[#2A2A2A] border border-[#333333] rounded-full text-xs text-white flex items-center gap-1">
                    🛏️ 2-Bedroom
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
