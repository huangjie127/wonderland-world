"use client";

import { useState } from "react";
import Link from "next/link";
import MailboxDialog from "./MailboxDialog";

export default function CharacterSidebar({
  characters,
  selectedCharacterId,
  onSelectCharacter,
  onCreateNew,
  pendingCount = 0,
  terminationCount = 0,
  unreadMsgCount = 0,
  onShowNotifications,
  onShowTerminations,
  onOpenMailbox,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showMailbox, setShowMailbox] = useState(false);

  const handleOpenMailbox = () => {
    setShowMailbox(true);
    if (onOpenMailbox) onOpenMailbox();
  };

  const filteredCharacters = characters.filter((char) =>
    char.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* 头部 - 创建按钮和通知 */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <button
          onClick={onCreateNew}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold text-sm transition"
        >
          + 创建新角色
        </button>

        <button
          onClick={handleOpenMailbox}
          className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 font-semibold text-sm transition flex items-center justify-center gap-2 relative"
        >
          <span>📬</span> 信箱
          {unreadMsgCount > 0 && (
            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white items-center justify-center">
                {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
              </span>
            </span>
          )}
        </button>

        {/* 关系请求通知按钮 */}
        {pendingCount > 0 && onShowNotifications && (
          <button
            onClick={onShowNotifications}
            className="w-full relative bg-amber-100 text-amber-800 py-2 rounded-lg hover:bg-amber-200 font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            🔔 收到 {pendingCount} 个关系请求
          </button>
        )}

        {/* 解除关系请求通知按钮 */}
        {terminationCount > 0 && onShowTerminations && (
          <button
            onClick={onShowTerminations}
            className="w-full relative bg-red-100 text-red-800 py-2 rounded-lg hover:bg-red-200 font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            🔓 收到 {terminationCount} 个解除请求
          </button>
        )}
      </div>

      {/* 搜索框 */}
      {characters.length > 3 && (
        <div className="p-3 border-b border-gray-200">
          <input
            type="text"
            placeholder="搜索角色..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* 角色列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredCharacters.length > 0 ? (
          <div className="space-y-1 p-2">
            {filteredCharacters.map((character) => (
              <button
                key={character.id}
                onClick={() => onSelectCharacter(character.id)}
                className={`w-full flex items-center gap-3 p-3 transition-colors border-l-2 ${
                  selectedCharacterId === character.id
                    ? "bg-indigo-50 border-indigo-600"
                    : "border-transparent hover:bg-gray-50"
                }`}
              >
                {/* 头像 */}
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                  {character.avatar_url ? (
                    <img
                      src={character.avatar_url}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      👤
                    </div>
                  )}
                </div>

                {/* 名字 */}
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">
                    {character.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {character.tagline || "无标语"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            {searchTerm ? "未找到角色" : "暂无角色"}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      {characters.length > 0 && (
        <div className="p-3 border-t border-gray-200 text-xs text-gray-600">
          <p>共 {characters.length} 个角色</p>
        </div>
      )}

      <MailboxDialog isOpen={showMailbox} onClose={() => setShowMailbox(false)} />
    </div>
  );
}
