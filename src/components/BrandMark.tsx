interface BrandMarkProps {
  size?: "sm" | "md" | "login";
  className?: string;
  inverse?: boolean;
}

const sizeStyles = {
  sm: {
    logo: "h-8 w-8",
    name: "text-base sm:text-lg",
  },
  md: {
    logo: "h-9 w-9",
    name: "text-xl",
  },
  login: {
    logo: "h-10 w-10",
    name: "text-2xl",
  },
} as const;

export function BrandMark({ size = "sm", className = "", inverse = false }: BrandMarkProps) {
  const styles = sizeStyles[size];

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={`${import.meta.env.BASE_URL}kizopay-logo.png`}
        alt="KizoPay logo"
        className={`${styles.logo} shrink-0 object-contain mix-blend-screen`}
      />
       <span className={`${styles.name} font-display font-black tracking-wider ${inverse ? "text-white" : "text-foreground"}`}>
         Kizo<span className={inverse ? "text-amber-300" : "text-primary"}>Pay</span>
      </span>
    </span>
  );
}