'use client';

import { useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Redo,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';
import { CONTRACT_PRINT_CSS } from '@/lib/utils/contract-document-renderer';

interface ContractRichTextEditorProps {
  initialHtml: string;
  onChange: (html: string) => void;
}

const BTN_CLS = 'rounded-md p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors';
const BTN_ACTIVE_CLS = 'rounded-md p-1.5 bg-accent/10 text-accent transition-colors';
const SEPARATOR_CLS = 'w-px h-5 bg-border-default mx-0.5';
const ICON_SIZE = 16;

/**
 * Extract body content from a full HTML document string.
 * Falls back to the entire string if no <body> tag is found.
 */
function extractBodyContent(fullHtml: string): string {
  const match = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1] : fullHtml;
}

export function ContractRichTextEditor({ initialHtml, onChange }: ContractRichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Editor manages its own state after mount.
  // initialHtml is only used at mount time via `content`.
  // When toggling edit↔preview, the component unmounts/remounts
  // so `content` is naturally re-evaluated on each mount.
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: extractBodyContent(initialHtml),
    onUpdate: ({ editor: e }) => {
      onChangeRef.current(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'contract-editor-content prose prose-sm max-w-none focus:outline-none',
      },
    },
  });

  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const toggleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor]);
  const toggleH1 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 1 }).run(), [editor]);
  const toggleH2 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 2 }).run(), [editor]);
  const toggleH3 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 3 }).run(), [editor]);
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);
  const alignLeft = useCallback(() => editor?.chain().focus().setTextAlign('left').run(), [editor]);
  const alignCenter = useCallback(() => editor?.chain().focus().setTextAlign('center').run(), [editor]);
  const alignRight = useCallback(() => editor?.chain().focus().setTextAlign('right').run(), [editor]);
  const undo = useCallback(() => editor?.chain().focus().undo().run(), [editor]);
  const redo = useCallback(() => editor?.chain().focus().redo().run(), [editor]);

  if (!editor) return null;

  const btnCls = (active: boolean) => (active ? BTN_ACTIVE_CLS : BTN_CLS);

  return (
    <div className="rounded-xl border border-border-default overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border-default bg-bg-secondary/40 px-2 py-1.5">
        <button type="button" onClick={toggleBold} className={btnCls(editor.isActive('bold'))} title="粗體">
          <Bold size={ICON_SIZE} />
        </button>
        <button type="button" onClick={toggleItalic} className={btnCls(editor.isActive('italic'))} title="斜體">
          <Italic size={ICON_SIZE} />
        </button>
        <button type="button" onClick={toggleUnderline} className={btnCls(editor.isActive('underline'))} title="底線">
          <UnderlineIcon size={ICON_SIZE} />
        </button>

        <div className={SEPARATOR_CLS} />

        <button type="button" onClick={toggleH1} className={btnCls(editor.isActive('heading', { level: 1 }))} title="標題 1">
          <Heading1 size={ICON_SIZE} />
        </button>
        <button type="button" onClick={toggleH2} className={btnCls(editor.isActive('heading', { level: 2 }))} title="標題 2">
          <Heading2 size={ICON_SIZE} />
        </button>
        <button type="button" onClick={toggleH3} className={btnCls(editor.isActive('heading', { level: 3 }))} title="標題 3">
          <Heading3 size={ICON_SIZE} />
        </button>

        <div className={SEPARATOR_CLS} />

        <button type="button" onClick={toggleBulletList} className={btnCls(editor.isActive('bulletList'))} title="無序列表">
          <List size={ICON_SIZE} />
        </button>
        <button type="button" onClick={toggleOrderedList} className={btnCls(editor.isActive('orderedList'))} title="有序列表">
          <ListOrdered size={ICON_SIZE} />
        </button>

        <div className={SEPARATOR_CLS} />

        <button type="button" onClick={alignLeft} className={btnCls(editor.isActive({ textAlign: 'left' }))} title="靠左對齊">
          <AlignLeft size={ICON_SIZE} />
        </button>
        <button type="button" onClick={alignCenter} className={btnCls(editor.isActive({ textAlign: 'center' }))} title="置中對齊">
          <AlignCenter size={ICON_SIZE} />
        </button>
        <button type="button" onClick={alignRight} className={btnCls(editor.isActive({ textAlign: 'right' }))} title="靠右對齊">
          <AlignRight size={ICON_SIZE} />
        </button>

        <div className={SEPARATOR_CLS} />

        <button type="button" onClick={undo} disabled={!editor.can().undo()} className={BTN_CLS} title="復原">
          <Undo size={ICON_SIZE} />
        </button>
        <button type="button" onClick={redo} disabled={!editor.can().redo()} className={BTN_CLS} title="重做">
          <Redo size={ICON_SIZE} />
        </button>
      </div>

      {/* Scoped contract CSS + Editor content */}
      <style>{`
        .contract-editor-content {
          ${CONTRACT_PRINT_CSS.replace(/@page[^}]+\}/g, '').replace(/body\s*\{/g, '&{')}
          padding: 24px 32px;
          min-height: 600px;
          max-height: 900px;
          overflow-y: auto;
        }
        .contract-editor-content h1 { text-align: center; font-size: 20pt; font-weight: bold; letter-spacing: 4px; margin: 0 0 8px; }
        .contract-editor-content h2 { font-size: 12pt; font-weight: bold; margin: 24px 0 6px; }
        .contract-editor-content h3 { font-size: 11pt; font-weight: bold; margin: 16px 0 6px; }
        .contract-editor-content p { margin: 0 0 6px; }
        .contract-editor-content ol { margin: 4px 0 8px; padding-left: 24px; }
        .contract-editor-content ol li { margin-bottom: 4px; }
        .contract-editor-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .contract-editor-content th, .contract-editor-content td { border: 1px solid #374151; padding: 6px 10px; vertical-align: top; }
        .contract-editor-content th { background: #f3f4f6; text-align: left; font-weight: 600; }
        .contract-editor-content .signature-block { border: 1px solid #374151; min-height: 100px; padding: 12px 16px; margin-bottom: 12px; }
        .contract-editor-content .signature-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 24px; }
        .contract-editor-content .signature-box { border: 1px solid #374151; min-height: 100px; padding: 12px 16px; }
      `}</style>
      <EditorContent editor={editor} />
    </div>
  );
}
