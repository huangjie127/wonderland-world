"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";

export default function RelationshipNotifications({ isOpen, onClose, onUpdate }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [myCharacters, setMyCharacters] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    fetchRequests();
  }, [isOpen, user]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // 获取当前用户的所有角色 ID
      const { data: myChars } = await supabase
        .from("characters")
        .select("id, name, avatar_url")
        .eq("user_id", user.id);

      const charMap = {};
      const charIds = [];
      (myChars || []).forEach((char) => {
        charMap[char.id] = char;
        charIds.push(char.id);
      });
      setMyCharacters(charMap);

      if (charIds.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // 获取待确认的关系请求（to_character_id 是我的角色）
      const { data } = await supabase
        .from("character_relationship_requests")
        .select(
          `
          id,
          from_character_id,
          to_character_id,
          from_role,
          to_role,
          status,
          created_at
        `
        )
        .in("to_character_id", charIds)
        .eq("status", "pending");

      // 获取发起者的信息
      const fromCharIds = [...new Set((data || []).map((r) => r.from_character_id))];
      if (fromCharIds.length > 0) {
        const { data: fromChars } = await supabase
          .from("characters")
          .select("id, name, avatar_url")
          .in("id", fromCharIds);

        const fromCharMap = {};
        (fromChars || []).forEach((char) => {
          fromCharMap[char.id] = char;
        });

        const enrichedRequests = (data || []).map((req) => ({
          ...req,
          fromCharacter: fromCharMap[req.from_character_id],
          toCharacter: charMap[req.to_character_id],
        }));

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    setProcessing(requestId);
    try {
      const { error } = await supabase
        .from("character_relationship_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (onUpdate) onUpdate();
    } catch (err) {
      alert("接受失败：" + err.message);
      console.error("Accept error:", err);
    }
    setProcessing(null);
  };

  const handleReject = async (requestId) => {
    if (!confirm("确定拒绝这个关系请求吗？")) return;

    setProcessing(requestId);
    try {
      const { error } = await supabase
        .from("character_relationship_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (onUpdate) onUpdate();
    } catch (err) {
      alert("拒绝失败：" + err.message);
      console.error("Reject error:", err);
    }
    setProcessing(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            🔔 关系请求 {requests.length > 0 && `(${requests.length})`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  {/* 请求信息 */}
                  <div className="flex items-center gap-4 mb-4">
                    {/* 发起者头像 */}
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                      {req.fromCharacter?.avatar_url ? (
                        <img
                          src={req.fromCharacter.avatar_url}
                          alt={req.fromCharacter.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          👤
                        </div>
                      )}
                    </div>

                    {/* 关系描述 */}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        {req.fromCharacter?.name} 想要建立关系
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {req.fromCharacter?.name}是{req.toCharacter?.name}的
                        <span className="font-semibold text-indigo-600">
                          {" "}
                          {req.from_role}
                        </span>
                        ，{req.toCharacter?.name}是{req.fromCharacter?.name}的
                        <span className="font-semibold text-indigo-600">
                          {" "}
                          {req.to_role}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        请求于{" "}
                        {new Date(req.created_at).toLocaleDateString("zh-CN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={processing === req.id}
                      className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-semibold transition"
                    >
                      {processing === req.id ? "处理中..." : "✓ 接受"}
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={processing === req.id}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:bg-gray-400 font-semibold transition"
                    >
                      {processing === req.id ? "处理中..." : "✗ 拒绝"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">暂无待确认的关系请求</p>
              <p className="text-sm text-gray-400 mt-2">
                当有人请求与你建立关系时，会在这里显示
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
