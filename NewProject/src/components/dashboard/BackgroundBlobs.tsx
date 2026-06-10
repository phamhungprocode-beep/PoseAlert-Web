export function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full opacity-30 blur-3xl animate-float-blob"
        style={{ background: "radial-gradient(circle, #2563eb 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full opacity-25 blur-3xl animate-float-blob"
        style={{
          background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
          animationDelay: "-6s",
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full opacity-20 blur-3xl animate-float-blob"
        style={{
          background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
          animationDelay: "-12s",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}