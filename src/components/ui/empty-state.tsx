import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

type ActionProps = {
  label: string
  href?: string
  onClick?: () => void
}

type Props = {
  icon?: LucideIcon
  title?: string
  description?: string
  action?: ActionProps
  secondaryAction?: ActionProps
}

export function EmptyState({
  icon: Icon,
  title = 'No data yet',
  description = 'There is no data to show for this view.',
  action,
  secondaryAction,
}: Props) {
  return (
    <Card className="text-center p-8 border-border shadow-lg">
      <CardHeader>
        {Icon && (
          <div className="flex justify-center mb-4">
            <Icon className="h-16 w-16 text-muted-foreground/40" aria-hidden="true" />
          </div>
        )}
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        <CardDescription className="text-base text-muted-foreground mt-3">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          {action && (
            action.href ? (
              <a href={action.href}>
                <Button size="lg">{action.label}</Button>
              </a>
            ) : (
              <Button size="lg" onClick={action.onClick}>
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <a href={secondaryAction.href}>
                <Button size="lg" variant="outline">
                  {secondaryAction.label}
                </Button>
              </a>
            ) : (
              <Button size="lg" variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default EmptyState
