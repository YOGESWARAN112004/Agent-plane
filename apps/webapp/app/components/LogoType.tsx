export function LogoType({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="AgentPlane"
      className={className}
      style={{ width: "auto", height: "100%", maxHeight: "32px", objectFit: "contain" }}
    />
  );
}
