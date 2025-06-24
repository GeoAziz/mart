
// This is a basic layout for the messaging section.
// It ensures consistent padding and structure.
export default function MessagingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto py-8">
      {children}
    </div>
  );
}
