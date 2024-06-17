import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatBalanceToNumber = (amount: any) => {
  try {
    const divider = 1000000000000000000
    const parsedPrice = (amount / divider).toFixed(6)
    const roundedPrice = (parseFloat(parsedPrice) * 100) / 100;
    return Number(roundedPrice.toFixed(6))
  } catch {
    return 0
  }
}

export const isNumber = (value: string): boolean => {
  return !isNaN(Number(value));
}