"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RelationshipGraph({ characterId, characterName, characterAvatar }) {
  const canvasRef = useRef(null);
  const [relationships, setRelationships] = useState([]);
  const [relatedCharacters, setRelatedCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const animationRef = useRef(null);
  const imagesRef = useRef({});

  useEffect(() => {
    fetchRelationships();
  }, [characterId]);

  const fetchRelationships = async () => {
    try {
      // 获取已接受的关系
      const { data } = await supabase
        .from("character_relationship_requests")
        .select("*")
        .eq("status", "accepted")
        .or(`from_character_id.eq.${characterId},to_character_id.eq.${characterId}`);

      if (!data) {
        setRelationships([]);
        setRelatedCharacters([]);
        setLoading(false);
        return;
      }

      setRelationships(data);
      
      // 获取所有相关角色的详细信息
      const relatedIds = new Set();
      (data || []).forEach((rel) => {
        if (rel.from_character_id !== characterId) {
          relatedIds.add(rel.from_character_id);
        }
        if (rel.to_character_id !== characterId) {
          relatedIds.add(rel.to_character_id);
        }
      });

      if (relatedIds.size > 0) {
        const { data: charactersData } = await supabase
          .from("characters")
          .select("id, name, avatar_url")
          .in("id", Array.from(relatedIds));

        setRelatedCharacters(charactersData || []);
      } else {
        setRelatedCharacters([]);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching relationships:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canvasRef.current || loading) return;

    // 加载所有头像
    loadAllAvatars();
    initializeGraph();
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [relationships, relatedCharacters, loading]);

  const loadAllAvatars = () => {
    // 加载中心角色头像
    if (characterAvatar) {
      const img = new Image();
      img.src = characterAvatar;
      imagesRef.current[characterId] = img;
    }

    // 加载相关角色头像
    relatedCharacters.forEach((char) => {
      if (char.avatar_url) {
        const img = new Image();
        img.src = char.avatar_url;
        imagesRef.current[char.id] = img;
      }
    });
  };

  const initializeGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // 中心节点（自己）
    nodesRef.current = [
      {
        id: characterId,
        name: characterName,
        avatar: characterAvatar,
        x: width / 2,
        y: height / 2,
        vx: 0,
        vy: 0,
        fixed: true,
        isCenter: true,
      },
      // 其他节点
      ...relatedCharacters.map((char, idx) => {
        const angle = (idx / relatedCharacters.length) * Math.PI * 2;
        const distance = 150;
        return {
          id: char.id,
          name: char.name,
          avatar: char.avatar_url,
          x: width / 2 + Math.cos(angle) * distance,
          y: height / 2 + Math.sin(angle) * distance,
          vx: 0,
          vy: 0,
          fixed: false,
          isCenter: false,
        };
      }),
    ];

    // 创建链接
    linksRef.current = relationships.map((rel) => {
      const sourceIdx = rel.from_character_id === characterId 
        ? 0 
        : nodesRef.current.findIndex((n) => n.id === rel.from_character_id);
      
      const targetIdx = rel.to_character_id === characterId 
        ? 0 
        : nodesRef.current.findIndex((n) => n.id === rel.to_character_id);

      return {
        source: sourceIdx >= 0 ? sourceIdx : 0,
        target: targetIdx >= 0 ? targetIdx : 0,
        fromRole: rel.from_role,
        toRole: rel.to_role,
      };
    });
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // 清空画布
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // 力导向算法
    simulateForces();

    // 绘制链接
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    linksRef.current.forEach((link) => {
      const sourceNode = nodesRef.current[link.source];
      const targetNode = nodesRef.current[link.target];

      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.stroke();

      // 绘制关系标签
      const midX = (sourceNode.x + targetNode.x) / 2;
      const midY = (sourceNode.y + targetNode.y) / 2;
      ctx.fillStyle = "#666";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      
      const label = link.fromRole === link.toRole 
        ? link.fromRole 
        : `${link.fromRole}/${link.toRole}`;
      ctx.fillText(label, midX, midY - 5);
    });

    // 绘制节点
    nodesRef.current.forEach((node) => {
      const size = node.isCenter ? 40 : 30;

      // 绘制圆形背景
      ctx.fillStyle = node.isCenter ? "#4f46e5" : "#818cf8";
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      ctx.fill();

      // 尝试绘制头像
      const img = imagesRef.current[node.id];
      if (img && img.complete && img.naturalHeight > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, size - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, node.x - size + 2, node.y - size + 2, size * 2 - 4, size * 2 - 4);
        ctx.restore();
      }

      // 绘制边框
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      ctx.stroke();

      // 绘制名字
      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(node.name, node.x, node.y + size + 20);
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  const simulateForces = () => {
    const repulsion = 1000;
    const attraction = 0.1;
    const damping = 0.9;
    const centerX = canvasRef.current.width / 2;
    const centerY = canvasRef.current.height / 2;

    // 计算斥力
    nodesRef.current.forEach((node, i) => {
      if (node.fixed) return;

      for (let j = i + 1; j < nodesRef.current.length; j++) {
        const other = nodesRef.current[j];
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);

        node.vx += (dx / dist) * force;
        node.vy += (dy / dist) * force;
        other.vx -= (dx / dist) * force;
        other.vy -= (dy / dist) * force;
      }
    });

    // 计算引力
    linksRef.current.forEach((link) => {
      const source = nodesRef.current[link.source];
      const target = nodesRef.current[link.target];
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attraction;

      source.vx += (dx / dist) * force;
      source.vy += (dy / dist) * force;
      target.vx -= (dx / dist) * force;
      target.vy -= (dy / dist) * force;
    });

    // 更新位置
    nodesRef.current.forEach((node) => {
      if (node.fixed) return;

      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;

      // 边界碰撞检测
      const size = node.isCenter ? 40 : 30;
      node.x = Math.max(size, Math.min(canvasRef.current.width - size, node.x));
      node.y = Math.max(size, Math.min(canvasRef.current.height - size, node.y));
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">加载关系图谱...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-bold mb-4">关系图谱</h2>
      
      {relationships.length > 0 ? (
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full border border-gray-200 rounded-lg bg-white"
        />
      ) : (
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">暂无建立的关系</p>
        </div>
      )}

      {/* 关系列表 */}
      {relationships.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 mb-3">关系列表</h3>
          <div className="space-y-2">
            {relationships.map((rel) => {
              const isInitiator = rel.from_character_id === characterId;
              const otherCharId = isInitiator ? rel.to_character_id : rel.from_character_id;
              const otherChar = relatedCharacters.find((c) => c.id === otherCharId);
              
              if (!otherChar) return null;

              return (
                <div
                  key={rel.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-2xl">🔗</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {isInitiator
                        ? `你是${otherChar.name}的${rel.from_role}`
                        : `你是${otherChar.name}的${rel.to_role}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {isInitiator
                        ? `${otherChar.name}是你的${rel.to_role}`
                        : `${otherChar.name}是你的${rel.from_role}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
