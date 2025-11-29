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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl max-w-md w-full p-8 shadow-2xl relative">
        <button  
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6 tracking-wide text-center font-serif">
          构筑位面
        </h2>

        <div className="mb-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex justify-between items-center">
          <span className="text-gray-600 text-sm font-medium">当前持有: <span className="text-indigo-600 font-mono font-bold">{coins}</span> 碎片</span>
          <span className="text-gray-600 text-sm font-medium">消耗: <span className="text-red-500 font-mono font-bold">-{COST}</span> 碎片</span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-500 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">位面名称</label>
            <input
              type="text"
              required
              maxLength={20}
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="给这个世界起个名字..."
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">场景描述</label>
            <textarea
              required
              maxLength={100}
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none shadow-sm"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="描述这里的景象..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">持续时间</label>
              <select
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-sm"
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
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">最大人数</label>
              <select
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-sm"
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
            className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm tracking-widest uppercase rounded-lg font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {loading ? '构筑中...' : '支付并创造'}
          </button>
        </form>
      </div>
    </div>
  );
}
