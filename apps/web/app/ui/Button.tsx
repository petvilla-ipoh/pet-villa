import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return <button {...props} className={`button ${variant === "ghost" ? "ghost" : ""} ${variant === "secondary" ? "secondary" : ""} ${className}`} />;
}
