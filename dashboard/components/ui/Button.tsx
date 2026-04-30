import React from "react";
import Link from "next/link";

type ButtonProps = {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  bgColor?: string;
  textColor?: string;
  border?: string;
  padding?: string;
  hover?: string;
  disabled?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  icon,
  onClick,
  href,
  className = "",
  bgColor,
  textColor,
  border,
  padding = "px-[10px] py-[6px]",
  hover,
  disabled = false,
}) => {
  const classes = `
    flex items-center gap-2 font-sans transition font-semibold border rounded-lg
    ${padding}
    ${bgColor}
    ${textColor}
    ${border}
    ${hover}
    ${className}
    ${disabled ? "cursor-not-allowed opacity-100" : ""}
  `;

  const content = (
    <>
      {icon && <span>{icon}</span>}
      {children}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-disabled={disabled}
        onClick={(e) => disabled && e.preventDefault()}
      >
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={classes}>
      {content}
    </button>
  );
};
