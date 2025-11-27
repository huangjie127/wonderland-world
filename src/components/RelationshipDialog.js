"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";

const PRESET_RELATIONSHIPS = {
  family: [
    { from: "父亲", to: "儿子" },
    { from: "父亲", to: "女儿" },
    { from: "母亲", to: "儿子" },
    { from: "母亲", to: "女儿" },
    { from: "哥哥", to: "弟弟" },
    { from: "哥哥", to: "妹妹" },
    { from: "姐姐", to: "妹妹" },
    { from: "祖父", to: "孙子" },
    { from: "祖母", to: "孙女" },
    { from: "叔叔", to: "侄子" },
    { from: "婶婶", to: "侄女" },
  ],
  romance: [
    { from: "丈夫", to: "妻子" },
    { from: "男友", to: "女友" },
  ],
  social: [
    { from: "上司", to: "下属" },
    { from: "同事", to: "同事" },
    { from: "老师", to: "学生" },
    { from: "朋友", to: "朋友" },
    { from: "敌人", to: "敌人" },
    { from: "合作伙伴", to: "合作伙伴" },
  ],
};

export default function RelationshipDialog({
  isOpen,
  onClose,
  onSubmit,
  targetCharacterId,
  targetCharacterName,
  isTargetOwner,
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: 选择发起者, 2: 选择预设, 3: 自定义, 4: 确认
  const [myCharacters, setMyCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [category, setCategory] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customFromRole, setCustomFromRole] = useState("");
  const [customToRole, setCustomToRole] = useState("");
  const [fromRole, setFromRole] = useState("");
  const [toRole, setToRole] = useState("");

  // 加载用户的所有角色
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchMyCharacters = async () => {
      const { data } = await supabase
        .from("characters")
        .select("id, name, avatar_url")
        .eq("user_id", user.id);

      // 过滤掉当前目标角色（避免自己和自己建立关系）
      const filteredData = data ? data.filter(c => c.id !== targetCharacterId) : [];
      setMyCharacters(filteredData);
    };

    fetchMyCharacters();
  }, [isOpen, user, targetCharacterId]);

  const handleCharacterSelect = (charId) => {
    setSelectedCharacterId(charId);
    setStep(2);
  };

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);
    setFromRole(preset.from);
    setToRole(preset.to);
    setStep(4);
  };

  const handleCustomSubmit = () => {
    if (!customFromRole.trim() || !customToRole.trim()) {
      alert("请填写完整的关系身份");
      return;
    }
    setFromRole(customFromRole);
    setToRole(customToRole);
    setStep(4);
  };

  const handleConfirm = () => {
    onSubmit({
      from_character_id: selectedCharacterId,
      to_character_id: targetCharacterId,
      from_role: fromRole,
      to_role: toRole,
    });
    resetDialog();
  };

  const resetDialog = () => {
    setStep(1);
    setSelectedCharacterId(null);
    setCategory(null);
    setSelectedPreset(null);
    setCustomFromRole("");
    setCustomToRole("");
    setFromRole("");
    setToRole("");
    onClose();
  };

  if (!isOpen) return null;

  const selectedCharName = myCharacters.find((c) => c.id === selectedCharacterId)?.name;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl max-w-md w-full mx-4 p-6 border border-white/50">
        {/* 关闭按钮 */}
        <button
          onClick={resetDialog}
          className="float-right text-gray-500 hover:text-gray-700 text-2xl"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold font-serif mb-4 text-gray-800">与 {targetCharacterName} 建立关系</h2>

        {/* Step 1: 选择发起者角色 */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-3">选择你的哪个角色与对方建立关系：</p>
            {myCharacters.length > 0 ? (
              <div className="space-y-2">
                {myCharacters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => handleCharacterSelect(char.id)}
                    className="w-full p-3 text-left border border-white/60 bg-white/50 rounded-lg hover:bg-indigo-50/80 transition flex items-center gap-3 shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border border-white/50">
                      {char.avatar_url ? (
                        <img
                          src={char.avatar_url}
                          alt={char.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm">
                          👤
                        </div>
                      )}
                    </div>
                    <span className="font-semibold text-gray-800">{char.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">你还没有创建任何角色</p>
            )}
          </div>
        )}

        {/* Step 2: 选择预设 */}
        {step === 2 && selectedCharName && (
          <div className="space-y-3">
            <button
              onClick={() => setStep(1)}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold mb-3"
            >
              ← 返回选择角色
            </button>

            <p className="text-sm text-gray-600">
              <span className="font-semibold">{selectedCharName}</span> 与{" "}
              <span className="font-semibold">{targetCharacterName}</span> 的关系
            </p>

            {Object.entries(PRESET_RELATIONSHIPS).map(([key, relationships]) => (
              <button
                key={key}
                onClick={() => {
                  setCategory(key);
                  setStep(3);
                }}
                className="w-full p-3 text-left border border-white/60 bg-white/50 rounded-lg hover:bg-indigo-50/80 transition shadow-sm"
              >
                <span className="font-semibold text-gray-800">
                  {key === "family"
                    ? "👨‍👩‍👧‍👦 亲缘关系"
                    : key === "romance"
                    ? "💕 爱情关系"
                    : "🤝 社会关系"}
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  {relationships.length} 种预设关系
                </p>
              </button>
            ))}

            <button
              onClick={() => {
                setCategory(null);
                setStep(3);
              }}
              className="w-full p-3 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50/50 transition font-semibold text-gray-600"
            >
              + 自定义关系
            </button>
          </div>
        )}

        {/* Step 3: 选择具体关系或自定义 */}
        {step === 3 && category && (
          <div className="space-y-3">
            <button
              onClick={() => setStep(2)}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold mb-3"
            >
              ← 返回分类
            </button>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {PRESET_RELATIONSHIPS[category].map((rel, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(rel)}
                  className="w-full p-3 text-left border border-white/60 bg-white/50 rounded-lg hover:bg-indigo-50/80 transition shadow-sm"
                >
                  <p className="font-semibold text-gray-800">
                    {selectedCharName}是{rel.from} → {targetCharacterName}是{rel.to}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setCategory(null);
                setStep(3);
              }}
              className="w-full p-3 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50/50 transition font-semibold text-gray-600 mt-4"
            >
              + 自定义关系
            </button>
          </div>
        )}

        {/* Step 3: 自定义关系 */}
        {step === 3 && !category && (
          <div className="space-y-4">
            <button
              onClick={() => setStep(2)}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold mb-3"
            >
              ← 返回
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedCharName}是{targetCharacterName}的什么？ *
              </label>
              <input
                type="text"
                value={customFromRole}
                onChange={(e) => setCustomFromRole(e.target.value)}
                placeholder="例如：父亲、朋友、老板"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {targetCharacterName}是{selectedCharName}的什么？ *
              </label>
              <input
                type="text"
                value={customToRole}
                onChange={(e) => setCustomToRole(e.target.value)}
                placeholder="例如：儿子、朋友、员工"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80"
              />
            </div>

            <button
              onClick={handleCustomSubmit}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold transition shadow-sm"
            >
              下一步
            </button>
          </div>
        )}

        {/* Step 4: 确认 */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-white/50 p-4 rounded-lg border border-white/60 shadow-inner">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">{selectedCharName}的身份：</p>
                <p className="text-lg font-bold text-indigo-600 font-serif">{fromRole}</p>

                <div className="flex items-center gap-2 justify-center text-gray-400">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span>↔</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>

                <p className="text-sm text-gray-600">{targetCharacterName}的身份：</p>
                <p className="text-lg font-bold text-indigo-600 font-serif">{toRole}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 text-center">
              {isTargetOwner 
                ? "由于这是你自己的角色，关系将直接建立。" 
                : "发起关系申请后，对方需要确认才能正式建立关系。"}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-gray-200/80 text-gray-800 py-2 rounded-lg hover:bg-gray-300/80 font-semibold transition"
              >
                修改
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold transition shadow-sm"
              >
                {isTargetOwner ? "建立关系" : "发起申请"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
