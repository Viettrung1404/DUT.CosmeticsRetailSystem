import {
  BoldOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Button, Space } from 'antd'
import { useEffect, useRef } from 'react'

interface Props {
  value?: string | null
  onChange?: (value: string) => void
  placeholder?: string
  minHeight?: number
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  minHeight = 180,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value ?? '')) {
      ref.current.innerHTML = value ?? ''
    }
  }, [value])

  const run = (command: string) => {
    ref.current?.focus()
    document.execCommand(command)
    onChange?.(ref.current?.innerHTML ?? '')
  }

  return (
    <div
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <div
        style={{
          padding: 8,
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
        }}
      >
        <Space size={4}>
          <Button
            size="small"
            type="text"
            icon={<BoldOutlined />}
            onClick={() => run('bold')}
          />
          <Button
            size="small"
            type="text"
            icon={<ItalicOutlined />}
            onClick={() => run('italic')}
          />
          <Button
            size="small"
            type="text"
            icon={<UnorderedListOutlined />}
            onClick={() => run('insertUnorderedList')}
          />
          <Button
            size="small"
            type="text"
            icon={<OrderedListOutlined />}
            onClick={() => run('insertOrderedList')}
          />
        </Space>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(event) => onChange?.(event.currentTarget.innerHTML)}
        style={{
          minHeight,
          padding: 12,
          outline: 'none',
          lineHeight: 1.6,
        }}
      />
    </div>
  )
}
