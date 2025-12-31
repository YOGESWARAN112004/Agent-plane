export function LogoIcon({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="AgentPlane Logo"
      className={className}
      style={{ width: "auto", height: "100%", maxHeight: "32px", objectFit: "contain" }}
    />
  );
}
