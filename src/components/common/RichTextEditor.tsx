import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export interface RichTextEditorRef {
  insertHtml: (html: string) => void
  getEditor: () => IDomEditor | null
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ value, onChange, placeholder = '请输入内容...' }, ref) => {
    // editor 实例
    const [editor, setEditor] = useState<IDomEditor | null>(null)

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      insertHtml: (html: string) => {
        if (editor) {
          editor.focus()
          editor.dangerouslyInsertHtml(html)
        }
      },
      getEditor: () => editor
    }))

    // 编辑器配置
    const editorConfig: Partial<IEditorConfig> = {
      placeholder,
      MENU_CONF: {}
    }

    // 工具栏配置
    const toolbarConfig: Partial<IToolbarConfig> = {
      excludeKeys: [
        'fullScreen', // 排除全屏，因为在弹窗内可能会有问题
      ]
    }

    // 及时销毁 editor ，重要！
    useEffect(() => {
      return () => {
        if (editor == null) return
        editor.destroy()
        setEditor(null)
      }
    }, [editor])

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-white" style={{ zIndex: 100 }}>
        <Toolbar
          editor={editor}
          defaultConfig={toolbarConfig}
          mode="default"
          className="border-b border-slate-100"
        />
        <Editor
          defaultConfig={editorConfig}
          value={value}
          onCreated={setEditor}
          onChange={editor => onChange(editor.getHtml())}
          mode="default"
          style={{ height: '400px', overflowY: 'hidden' }}
        />
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'
