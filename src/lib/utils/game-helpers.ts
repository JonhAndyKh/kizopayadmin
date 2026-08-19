export const CATEGORIES = [
  "All",
  "MOBA",
  "Battle Royale",
  "RPG",
  "Shooter",
  "Strategy",
  "Sports",
  "Casual",
];

export function generateGamePlaceholder(gameCode: string): string {
  // A simple deterministic color based on game code
  const colors = [
    "from-indigo-500 to-purple-600",
    "from-emerald-400 to-cyan-500",
    "from-rose-400 to-red-500",
    "from-amber-400 to-orange-500",
    "from-sky-400 to-blue-500",
    "from-fuchsia-500 to-pink-600",
  ];
  let hash = 0;
  for (let i = 0; i < gameCode.length; i++) {
    hash = gameCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function formatCurrency(amount: string | number, currency: "USD" | "KHR" = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

const ID_CHECKER_GAMES = [
  "zepeto",
  "growtopia",
  "pixelgun3d",
  "magicchessgogo",
  "mcgg",
  "mobilelegendsadventure",
  "8ballpool",
  "pubgmobile",
  "pubgm",
  "identityv",
  "supersus",
  "honorofkings",
];

export function supportsPlayerIdCheck(gameCode = "", gameName = ""): boolean {
  const searchable = `${gameCode} ${gameName}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ID_CHECKER_GAMES.some((game) => searchable.includes(game));
}
