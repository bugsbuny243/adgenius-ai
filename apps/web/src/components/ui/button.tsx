import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export const Button = ({ variant = "primary", className = "", ...props }: Props) => {
  const styles =
    variant === "primary"
      ? "bg-gradient-to-r from-cyan-300 to-indigo-400 text-slate-950"
      : "border border-white/20 bg-white/5 text-white";

  return <button {...props} className={`rounded-xl px-4 py-2 font-semibold transition hover:opacity-90 ${styles} ${className}`} />;
};
