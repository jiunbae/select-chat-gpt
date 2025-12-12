"use server";

import { cookies } from "next/headers";
import { locales, type Locale, LOCALE_COOKIE_NAME } from "./config";

export async function setLocale(locale: Locale) {
  if (!locales.includes(locale)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
}
