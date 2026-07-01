interface TestShellProps {
  children: React.ReactNode;
}

export default function TestShell({ children }: TestShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50">
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        {children}
      </div>
    </div>
  );
}
