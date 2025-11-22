"use client";

import { useState } from "react";

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
  targetCharacterName,
}) {
  const [step, setStep] = useState(1); // 1: 选择预设, 2: 自定义, 3: 确认
  const [category, setCategory] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customFromRole, setCustomFromRole] = useState("");
  const [customToRole, setCustomToRole] = useState("");
  const [fromRole, setFromRole] = useState("");
  const [toRole, setToRole] = useState("");

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);
    setFromRole(preset.from);
    setToRole(preset.to);
    setStep(3);
  };

  const handleCustomSubmit = () => {
    if (!customFromRole.trim() || !customToRole.trim()) {
      alert("请填写完整的关系身份");
      return;
    }
    setFromRole(customFromRole);
    setToRole(customToRole);
    setStep(3);
  };

  const handleConfirm = () => {
    onSubmit({
      from_role: fromRole,
      to_role: toRole,
    });
    resetDialog();
  };

  const resetDialog = () => {
    setStep(1);
    setCategory(null);
    setSelectedPreset(null);
    setCustomFromRole("");
    setCustomToRole("");
    setFromRole("");
    setToRole("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* 关闭按钮 */}
        <button
          onClick={resetDialog}
          className="float-right text-gray-500 hover:text-gray-700 text-2xl"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4">与 {targetCharacterName} 建立关系</h2>

        {/* Step 1: 选择预设 */}
        {step === 1 && (
          <div className="space-y-3">
            {Object.entries(PRESET_RELATIONSHIPS).map(([key, relationships]) => (
              <button
                key={key}
                onClick={() => {
                  setCategory(key);
                  setStep(2);
                }}
                className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-indigo-50 transition"
              >
                <span className="font-semibold">
                  {key === "family"
                    ? "👨‍👩‍👧‍👦 亲缘关系"
                    : key === "romance"
                    ? "💕 爱情关系"
                    : "🤝 社会关系"}
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  {relationships.length} 种预设关系
                </p>
              </button>
            ))}

            <button
              onClick={() => setStep(2)}
              className="w-full p-3 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition font-semibold text-gray-700"
            >
              + 自定义关系
            </button>
          </div>
        )}

        {/* Step 2: 选择具体关系或自定义 */}
        {step === 2 && category && (
          <div className="space-y-3">
            <button
              onClick={() => setStep(1)}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold mb-3"
            >
              ← 返回分类
            </button>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {PRESET_RELATIONSHIPS[category].map((rel, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(rel)}
                  className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-indigo-50 transition"
                >
                  <p className="font-semibold">
                    你是{rel.from} → 对方是{rel.to}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setCategory(null);
                setStep(2);
              }}
              className="w-full p-3 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition font-semibold text-gray-700 mt-4"
            >
              + 自定义关系
            </button>
          </div>
        )}

        {/* Step 2: 自定义关系 */}
        {step === 2 && !category && (
          <div className="space-y-4">
            <button
              onClick={() => setStep(1)}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold mb-3"
            >
              ← 返回
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                你是{targetCharacterName}的什么？ *
              </label>
              <input
                type="text"
                value={customFromRole}
                onChange={(e) => setCustomFromRole(e.target.value)}
                placeholder="例如：父亲、朋友、老板"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {targetCharacterName}是你的什么？ *
              </label>
              <input
                type="text"
                value={customToRole}
                onChange={(e) => setCustomToRole(e.target.value)}
                placeholder="例如：儿子、朋友、员工"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleCustomSubmit}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold transition"
            >
              下一步
            </button>
          </div>
        )}

        {/* Step 3: 确认 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">你的身份：</p>
                <p className="text-lg font-bold text-indigo-600">{fromRole}</p>

                <div className="flex items-center gap-2 justify-center text-gray-400">
                  <div className="flex-1 border-t"></div>
                  <span>↔</span>
                  <div className="flex-1 border-t"></div>
                </div>

                <p className="text-sm text-gray-600">{targetCharacterName}的身份：</p>
                <p className="text-lg font-bold text-indigo-600">{toRole}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 text-center">
              发起关系申请后，对方需要确认才能正式建立关系。
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 font-semibold transition"
              >
                修改
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold transition"
              >
                发起申请
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
