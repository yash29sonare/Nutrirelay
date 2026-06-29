export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
