import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatCredits(credits: number): string {
  // 100 credits = £1.00 (1 credit = £0.01)
  const pounds = credits / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(pounds);
}

export function maskApiKey(key: string | null | undefined): string {
  if (!key) return '••••••••';
  // For API keys like "warm_vkeI", show "warm_••••...••••"
  if (key.startsWith('warm_')) {
    return 'warm_••••...••••';
  }
  if (key.length <= 8) return key;
  return key.slice(0, 4) + '...' + key.slice(-4);
}
