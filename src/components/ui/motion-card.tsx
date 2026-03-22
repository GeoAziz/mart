'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Card as BaseCard } from './card'

export default function MotionCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.32 }}
      className={className}
      {...props}
    >
      <BaseCard>{children}</BaseCard>
    </motion.div>
  )
}
