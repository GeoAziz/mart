import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Props = {
  title?: string
  description?: string
  cta?: { label: string; href?: string; onClick?: () => void }
}

export default function EmptyState({ title = 'No data yet', description = 'There is no data to show for this view.', cta }: Props) {
  return (
    <Card className="text-center p-6">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground mt-2">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {cta && (
          cta.href ? (
            <a href={cta.href} className="inline-block mt-4">
              <Button>{cta.label}</Button>
            </a>
          ) : (
            <Button onClick={cta.onClick} className="mt-4">{cta.label}</Button>
          )
        )}
      </CardContent>
    </Card>
  )
}
