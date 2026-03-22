'use client'

import * as React from 'react'
import { Command } from 'cmdk'
import { Dialog, DialogContent } from '@/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CommandPalette({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group]:overflow-hidden [&_[cmdk-group-heading]]:px-2 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12">
          <Command.Input placeholder="Search or run a command... (Cmd/Ctrl+K)" />
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group heading="Quick Actions">
              <Command.Item onSelect={() => window.location.assign('/admin/overview')}>
                Go to Admin Overview
              </Command.Item>
              <Command.Item onSelect={() => window.location.assign('/admin/product-moderation')}>
                Open Product Moderation
              </Command.Item>
              <Command.Item onSelect={() => window.location.assign('/admin/users')}>
                Open User Management
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
