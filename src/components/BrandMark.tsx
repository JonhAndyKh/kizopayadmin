interface BrandMarkProps {
  size?: "sm" | "md" | "login";
  className?: string;
  inverse?: boolean;
}

const sizeStyles = {
  sm: {
    logo: "h-14 w-[5.25rem]",
  },
  md: {
    logo: "h-14 w-[5.25rem]",
  },
  login: {
    logo: "h-20 w-[8rem]",
  },
} as const;

export function BrandMark({ size = "sm", className = "", inverse = false }: BrandMarkProps) {
  const styles = sizeStyles[size];

  return (
    <span className={`flex items-center ${className}`}>
      <img
        src={`${import.meta.env.BASE_URL}kizotopup-logo.png`}
        alt="KizoTopup logo"
        className={`${styles.logo} shrink-0 object-contain`}
      />
    </span>
  );
}