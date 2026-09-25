import { Card, Empty, Typography } from 'antd'

interface PagePlaceholderProps {
  title: string
  description: string
}

export default function PagePlaceholder({
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <>
      <Typography.Title level={3}>{title}</Typography.Title>
      <Card>
        <Empty description={description} />
      </Card>
    </>
  )
}
