"use client";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RichTextEditor({ content, onChange, watermarkText }) {
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  const uploadImage = useCallback(async (file) => {
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("watermarkText", watermarkText || "OCBase");

      const uploadRes = await fetch("/api/upload-watermark", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image");
      }

      const { publicUrl } = await uploadRes.json();

      // 插入图片到编辑器
      editor?.chain().focus().setImage({ src: publicUrl }).run();
    } catch (err) {
      console.error('Upload error:', err);
      alert('上传失败，请重试');
    }
  }, [editor, watermarkText]);

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
    // 重置 input，允许重复选择同一文件
    e.target.value = '';
  }, [uploadImage]);

  const addImageByUrl = useCallback(() => {
    const url = window.prompt('请输入图片 URL:');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return <div className="text-gray-400">编辑器加载中...</div>;
  }

  return (
    <div className="border border-gray-600 rounded-lg overflow-hidden bg-gray-800">
      {/* 隐藏的文件选择器 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 工具栏 */}
      <div className="border-b border-gray-600 bg-gray-700 p-2 flex flex-wrap gap-2">
        {/* 文本样式 */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded text-sm ${editor.isActive('bold') ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          title="粗体"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded text-sm ${editor.isActive('italic') ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          title="斜体"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-3 py-1 rounded text-sm ${editor.isActive('underline') ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          title="下划线"
        >
          <u>U</u>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-3 py-1 rounded text-sm ${editor.isActive('strike') ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          title="删除线"
        >
          <s>S</s>
        </button>

        <div className="w-px bg-gray-600 mx-1"></div>

        {/* 标题 */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 rounded text-sm ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          title="大标题"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          title="中标题"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 rounded text-sm ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          title="小标题"
        >
          H3
        </button>

        <div className="w-px bg-gray-600 mx-1"></div>

        {/* 对齐 */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`px-3 py-1 rounded text-sm ${editor.isActive({ textAlign: 'left' }) ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          title="左对齐"
        >
          ⬅
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`px-3 py-1 rounded text-sm ${editor.isActive({ textAlign: 'center' }) ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          title="居中"
        >
          ↔
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`px-3 py-1 rounded text-sm ${editor.isActive({ textAlign: 'right' }) ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          title="右对齐"
        >
          ➡
        </button>

        <div className="w-px bg-gray-600 mx-1"></div>

        {/* 列表 */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded text-sm ${editor.isActive('bulletList') ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          title="无序列表"
        >
          ●
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 rounded text-sm ${editor.isActive('orderedList') ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          title="有序列表"
        >
          1.
        </button>

        <div className="w-px bg-gray-600 mx-1"></div>

        {/* 图片 */}
        <button
          onClick={handleImageUpload}
          className="px-3 py-1 rounded text-sm bg-green-600 hover:bg-green-700"
          title="上传图片"
        >
          📤 上传
        </button>
        <button
          onClick={addImageByUrl}
          className="px-3 py-1 rounded text-sm bg-gray-600 hover:bg-gray-500"
          title="插入图片链接"
        >
          🖼️ URL
        </button>

        <div className="w-px bg-gray-600 mx-1"></div>

        {/* 撤销/重做 */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-3 py-1 rounded text-sm bg-gray-600 hover:bg-gray-500 disabled:opacity-50"
          title="撤销"
        >
          ↶
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-3 py-1 rounded text-sm bg-gray-600 hover:bg-gray-500 disabled:opacity-50"
          title="重做"
        >
          ↷
        </button>
      </div>

      {/* 编辑区域 */}
      <div className="bg-gray-800 text-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
