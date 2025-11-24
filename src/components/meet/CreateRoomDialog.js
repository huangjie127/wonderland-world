"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CreateRoomDialog({ isOpen, onClose, characterId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [coins, setCoins] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '60', // minutes
    maxPlayers: '10'
  });
  const [error, setError] = useState('');

  const COST = 50;

  useEffect(() => {
    if (isOpen && characterId) {
      fetchCoins();
    }
  }, [isOpen, characterId]);

  const fetchCoins = async () => {
    const { data, error } = await supabase
      .from('characters')
      .select('coins')
      .eq('id', characterId)
      .single();
    
    if (data) {
      setCoins(data.coins || 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (coins < COST) {
        throw new Error(`余额不足，需要 ${COST} 灵魂碎片`);
      }

      const { data, error } = await supabase.rpc('create_user_room', {
        room_title: formData.title,
        room_desc: formData.description,
        duration_minutes: parseInt(formData.duration),
        max_people: parseInt(formData.maxPlayers),
        cost: COST,
        char_id: parseInt(characterId)
      });

      if (error) throw error;

      if (data && data.success) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          title: '',
          description: '',
          duration: '60',
          maxPlayers: '10'
        });
      } else {
        throw new Error(data?.message || '创建失败');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#12131a] border border-gray-700 rounded-lg max-w-md w-full p-6 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300"
        >
          ✕
        </button>

        <h2 className="text-2xl font-light text-gray-100 mb-6 tracking-widest uppercase text-center">
          构筑位面
        </h2>

        <div className="mb-6 p-4 bg-black/30 rounded border border-gray-800 flex justify-between items-center">
          <span className="text-gray-400 text-sm">当前持有: <span className="text-blue-400 font-mono">{coins}</span> 碎片</span>
          <span className="text-gray-400 text-sm">消耗: <span className="text-red-400 font-mono">-{COST}</span> 碎片</span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 text-red-400 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">位面名称</label>
            <input
              type="text"
              required
              maxLength={20}
              className="w-full bg-[#0a0b10] border border-gray-700 rounded px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="给这个世界起个名字..."
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">场景描述</label>
            <textarea
              required
              maxLength={100}
              rows={3}
              className="w-full bg-[#0a0b10] border border-gray-700 rounded px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors resize-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="描述这里的景象..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">持续时间</label>
              <select
                className="w-full bg-[#0a0b10] border border-gray-700 rounded px-3 py-2 text-gray-200 outline-none"
                value={formData.duration}
                onChange={e => setFormData({...formData, duration: e.target.value})}
              >
                <option value="30">30 分钟</option>
                <option value="60">1 小时</option>
                <option value="120">2 小时</option>
                <option value="180">3 小时</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">最大人数</label>
              <select
                className="w-full bg-[#0a0b10] border border-gray-700 rounded px-3 py-2 text-gray-200 outline-none"
                value={formData.maxPlayers}
                onChange={e => setFormData({...formData, maxPlayers: e.target.value})}
              >
                <option value="5">5 人</option>
                <option value="10">10 人</option>
                <option value="20">20 人</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || coins < COST}
            className="w-full mt-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm tracking-widest uppercase border border-gray-600 hover:border-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '构筑中...' : '支付并创造'}
          </button>
        </form>
      </div>
    </div>
  );
}
