'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { MessageCircle, Book, HelpCircle, Phone } from 'lucide-react'
import Link from 'next/link'

const FAQs = [
  {
    question: "How do I list a new product?",
    answer: "Go to Products > Add New Product. Fill in all required fields and upload product images. Make sure to set accurate pricing and inventory levels."
  },
  {
    question: "How do payouts work?",
    answer: "Payouts are processed weekly for all completed orders. Minimum payout amount is KSh 1,000. You can view your payout history in the Financial Reports section."
  },
  {
    question: "What are the selling fees?",
    answer: "We charge a 10% commission on each sale. This includes payment processing fees. You receive 90% of the sale price minus any refunds or adjustments."
  },
  // Add more FAQs as needed
]

export default function SupportCenter() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const { toast } = useToast()

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/vendor/support/ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, message }),
      })
      
      if (!response.ok) throw new Error('Failed to submit ticket')
      
      toast({
        title: "Support Ticket Created",
        description: "We'll get back to you within 24 hours",
      })
      
      setSubject('')
      setMessage('')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create support ticket. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Tabs defaultValue="faq" className="space-y-4">
      <TabsList>
        <TabsTrigger value="faq">FAQs</TabsTrigger>
        <TabsTrigger value="contact">Contact Support</TabsTrigger>
        <TabsTrigger value="resources">Resources</TabsTrigger>
      </TabsList>

      <TabsContent value="faq" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {FAQs.map((faq, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  {faq.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="contact" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Submit a Support Ticket</CardTitle>
            <CardDescription>
              Our support team typically responds within 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="subject">Subject</label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="message">Message</label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail"
                  required
                  rows={5}
                />
              </div>
              <Button type="submit" className="w-full">
                Submit Ticket
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Live Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Chat with our support team in real-time
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/messaging">Start Chat</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Phone Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Available Mon-Fri, 9AM-5PM
              </p>
              <Button variant="outline" className="w-full">
                +254 700 000000
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="resources" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Seller Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" className="h-auto p-4 text-left" asChild>
                  <Link href="/docs/getting-started">
                    <div>
                      <h4 className="text-sm font-semibold">Getting Started Guide</h4>
                      <p className="text-sm text-muted-foreground">
                        Learn the basics of selling on our platform
                      </p>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="h-auto p-4 text-left" asChild>
                  <Link href="/docs/best-practices">
                    <div>
                      <h4 className="text-sm font-semibold">Best Practices</h4>
                      <p className="text-sm text-muted-foreground">
                        Tips to increase your sales and visibility
                      </p>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="h-auto p-4 text-left" asChild>
                  <Link href="/docs/policies">
                    <div>
                      <h4 className="text-sm font-semibold">Policies & Guidelines</h4>
                      <p className="text-sm text-muted-foreground">
                        Important rules and policies to follow
                      </p>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="h-auto p-4 text-left" asChild>
                  <Link href="/docs/shipping">
                    <div>
                      <h4 className="text-sm font-semibold">Shipping Guide</h4>
                      <p className="text-sm text-muted-foreground">
                        Learn about shipping options and best practices
                      </p>
                    </div>
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
