"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";

export default function TerminationNotifications({ isOpen, onClose, onUpdate }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [myCharacters, setMyCharacters] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    fetchTerminationRequests();
  }, [isOpen, user]);

  const fetchTerminationRequests = async () => {
    setLoading(true);
    try {
      // 获取当前用户的所有角色
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

      // 获取待确认的解除请求
      // 需要的是：我的角色在关系中，且不是请求者
      const { data } = await supabase
        .from("character_relationship_terminations")
        .select(
          `
          id,
          relationship_id,
          requested_by,
          status,
          created_at
        `
        )
        .eq("status", "pending");

      // 过滤出与我相关的解除请求（我是接收方）
      const relatedTerminations = [];
      
      if (data && data.length > 0) {
        // 获取关系信息
        const { data: relationships } = await supabase
          .from("character_relationship_requests")
          .select("id, from_character_id, to_character_id, from_role, to_role")
          .in(
            "id",
            data.map((t) => t.relationship_id)
          );

        // 构建关系 map
        const relMap = {};
        (relationships || []).forEach((rel) => {
          relMap[rel.id] = rel;
        });

        // 获取请求者信息
        const requesterIds = [...new Set(data.map((t) => t.requested_by))];
        const { data: requesters } = await supabase
          .from("characters")
          .select("id, name, avatar_url")
          .in("id", requesterIds);

        const requesterMap = {};
        (requesters || []).forEach((char) => {
          requesterMap[char.id] = char;
        });

        // 过滤和丰富数据
        data.forEach((term) => {
          const rel = relMap[term.relationship_id];
          if (!rel) return;

          // 检查我是否在这个关系中且不是请求者
          const isInvolvedAsOther =
            (charIds.includes(rel.from_character_id) ||
              charIds.includes(rel.to_character_id)) &&
            term.requested_by !== rel.from_character_id &&
            term.requested_by !== rel.to_character_id;

          if (isInvolvedAsOther || (charIds.includes(rel.from_character_id) && rel.to_character_id === term.requested_by) || (charIds.includes(rel.to_character_id) && rel.from_character_id === term.requested_by)) {
            const requester = requesterMap[term.requested_by];
            const otherCharId =
              rel.from_character_id === term.requested_by
                ? rel.to_character_id
                : rel.from_character_id;

            relatedTerminations.push({
              ...term,
              relationship: rel,
              requester,
              otherCharId,
            });
          }
        });
      }

      setRequests(relatedTerminations);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching termination requests:", err);
      setLoading(false);
    }
  };

  const handleAccept = async (terminationId, relationshipId) => {
    setProcessing(terminationId);
    try {
      // 更新解除申请为已接受
      const { error: updateError } = await supabase
        .from("character_relationship_terminations")
        .update({ status: "accepted" })
        .eq("id", terminationId);

      if (updateError) throw updateError;

      // 删除原始关系
      const { error: deleteError } = await supabase
        .from("character_relationship_requests")
        .delete()
        .eq("id", relationshipId);

      if (deleteError) throw deleteError;

      setRequests((prev) => prev.filter((r) => r.id !== terminationId));
      if (onUpdate) onUpdate();
    } catch (err) {
      alert("接受失败：" + err.message);
      console.error("Accept error:", err);
    }
    setProcessing(null);
  };

  const handleReject = async (terminationId) => {
    if (!confirm("确定要拒绝对方解除关系吗？")) return;

    setProcessing(terminationId);
    try {
      const { error } = await supabase
        .from("character_relationship_terminations")
        .update({ status: "rejected" })
        .eq("id", terminationId);

      if (error) throw error;

      setRequests((prev) => prev.filter((r) => r.id !== terminationId));
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
            🔓 解除关系申请 {requests.length > 0 && `(${requests.length})`}
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
                    {/* 请求者头像 */}
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                      {req.requester?.avatar_url ? (
                        <img
                          src={req.requester.avatar_url}
                          alt={req.requester.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          👤
                        </div>
                      )}
                    </div>

                    {/* 解除描述 */}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        {req.requester?.name} 想要解除关系
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        解除：{req.requester?.name}是{req.relationship?.to_character_id === req.requester?.id ? req.relationship?.from_role : req.relationship?.to_role}
                        的关系
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        申请于{" "}
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
                      onClick={() =>
                        handleAccept(req.id, req.relationship_id)
                      }
                      disabled={processing === req.id}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold transition"
                    >
                      {processing === req.id ? "处理中..." : "✓ 同意解除"}
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
              <p className="text-gray-500 text-lg">暂无待处理的解除申请</p>
              <p className="text-sm text-gray-400 mt-2">
                当有人请求解除与你的关系时，会在这里显示
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
