"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingCart, Package, ChevronDown } from "lucide-react";
import { BRAND_SLOGAN } from "@/lib/brand";

const navLinks = [
  { href: "/#produk", label: "Produk" },
  { href: "/marketplace", label: "Toko Karya" },
];

const audienceLinks = [
  { href: "/#untuk-umum", label: "Untuk Umum" },
  { href: "/#untuk-murid", label: "Untuk Murid" },
  { href: "/#untuk-guru", label: "Untuk Guru" },
];

const marketplacePaths = ["/marketplace", "/cart", "/checkout", "/orders"];

function isMarketplacePage(pathname: string): boolean {
  return marketplacePaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isActivePath(pathname: string, href: string): boolean {
  if (href.startsWith("/#")) return false;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function PageNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const audienceRef = useRef<HTMLDivElement>(null);

  const showMarketplaceNav = isMarketplacePage(pathname);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.id || d?.user?.id) {
          setUser({ fullName: d.fullName || d.user?.fullName || "User", role: d.role || d.user?.role || "MURID" });
        }
      })
      .catch(() => {})
      .finally(() => setUserLoading(false));
  }, []);

  useEffect(() => {
    if (!showMarketplaceNav) return;
    const updateCart = () => {
      const cart = JSON.parse(localStorage.getItem("bc-cart") || "[]");
      setCartCount(cart.reduce((sum: number, i: { qty?: number }) => sum + (i.qty || 1), 0));
    };
    updateCart();
    window.addEventListener("cart-update", updateCart);
    return () => window.removeEventListener("cart-update", updateCart);
  }, [showMarketplaceNav]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setAudienceOpen(false);
  }, [pathname]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setMobileOpen(false);
      setAudienceOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!audienceOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (audienceRef.current && !audienceRef.current.contains(e.target as Node)) {
        setAudienceOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [audienceOpen]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const getDashboardHref = (role: string) => {
    if (role === "ADMIN") return "/admin";
    if (role === "MURID") return "/arena";
    if (role === "UMUM") return "/umum";
    return "/guru/beranda";
  };

  const linkClass = (active: boolean) =>
    `relative px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 focus-ring whitespace-nowrap ${
      active
        ? "text-bc-accent bg-bc-accent-soft"
        : "text-bc-text-2 hover:text-bc-accent hover:bg-bc-accent-soft"
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50" onKeyDown={handleKeyDown}>
      <div
        className={`transition-all duration-500 ${
          scrolled
            ? "bg-bc-surface/95 border-b border-bc-line shadow-sm backdrop-blur-md"
            : "bg-bc-surface/80 border-b border-transparent backdrop-blur-md"
        }`}
      >
      <div className="mx-auto flex h-16 min-w-0 max-w-7xl items-center justify-between gap-2 px-3 sm:h-[4.5rem] sm:px-6 lg:h-20 lg:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-2 sm:gap-2.5 lg:max-w-[min(100%,20rem)]">
          <div className="relative h-8 w-8 shrink-0 lg:h-9 lg:w-9">
            <Image
              src="/brand/bc2026-icon-dark.png"
              alt="Logo BahasaCerdas"
              fill
              sizes="36px"
              className="object-contain"
              priority
            />
          </div>
          <div className="hidden min-w-0 flex-col sm:flex">
            <span className="truncate font-bold text-base leading-tight text-bc-text lg:text-lg">
              Bahasa<span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--bc-grad-brand)" }}>Cerdas</span>
            </span>
            <span className="max-w-[14rem] text-[10px] font-medium leading-tight text-bc-text-3 xl:max-w-none xl:whitespace-nowrap xl:text-[11px]">
              {BRAND_SLOGAN}
            </span>
          </div>
        </Link>

        {/* Desktop Nav: at most 3 text items */}
        <nav aria-label="Navigasi utama" className="hidden lg:flex min-w-0 items-center justify-center gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(isActivePath(pathname, link.href))}
            >
              {link.label}
            </Link>
          ))}
          <div className="relative" ref={audienceRef}>
            <button
              type="button"
              className={linkClass(audienceOpen)}
              aria-haspopup="menu"
              aria-expanded={audienceOpen}
              aria-controls="untuk-siapa-menu"
              onClick={() => setAudienceOpen((open) => !open)}
            >
              Untuk Siapa
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={`ml-1 inline-block transition-transform duration-200 ${audienceOpen ? "rotate-180" : ""}`}
              />
            </button>
            {audienceOpen && (
              <div
                id="untuk-siapa-menu"
                role="menu"
                aria-label="Untuk Siapa"
                className="absolute left-1/2 top-full z-50 mt-2 w-52 -translate-x-1/2 rounded-2xl border border-bc-line bg-bc-surface p-1.5 shadow-lg"
              >
                {audienceLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    onClick={() => setAudienceOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-bc-text-2 transition-colors duration-200 hover:bg-bc-accent-soft hover:text-bc-accent focus-ring"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {showMarketplaceNav && (
            <>
              <Link
                href="/orders"
                className="relative ml-1 px-3 py-2 text-bc-text-2 hover:text-bc-accent transition-colors rounded-xl hover:bg-bc-accent-soft focus-ring"
                aria-label="Pesanan Saya"
              >
                <Package size={20} />
              </Link>
              <Link
                href="/cart"
                className="relative ml-1 px-3 py-2 text-bc-text-2 hover:text-bc-accent transition-colors rounded-xl hover:bg-bc-accent-soft focus-ring"
                aria-label={`Keranjang, ${cartCount} item`}
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            </>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
          {userLoading ? (
            <div className="h-10 w-36" aria-hidden="true" />
          ) : user ? (
            <Link
              href={getDashboardHref(user.role)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-bc-text-2 bg-bc-surface-2 hover:bg-bc-accent-soft rounded-xl transition-colors border border-bc-line focus-ring"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-bc-accent to-bc-violet flex items-center justify-center text-white text-[10px] font-bold">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[120px] truncate">{user.fullName}</span>
            </Link>
          ) : (
            <>
              <Link
                href={`/login?next=${encodeURIComponent(pathname)}`}
                className="px-4 py-2.5 text-sm font-semibold text-bc-text-2 hover:text-bc-accent transition-colors focus-ring rounded-lg whitespace-nowrap"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="relative px-5 py-2.5 text-sm font-semibold text-bc-on-brand bg-bc-brand rounded-xl transition-all duration-200 shadow-bc-glow hover:-translate-y-0.5 focus-ring whitespace-nowrap"
              >
                Mulai Gratis
              </Link>
            </>
          )}
        </div>

        {/* Mobile: Mulai Gratis + hamburger */}
        <div className="flex lg:hidden items-center gap-1.5 shrink-0">
          {!userLoading && !user && (
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-bc-brand px-3 py-2 text-xs font-semibold text-bc-on-brand shadow-bc-glow transition-all duration-200 focus-ring whitespace-nowrap sm:px-4 sm:text-sm"
            >
              Mulai Gratis
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="relative z-50 grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-bc-surface-2 transition-colors focus-ring"
            aria-controls="mobile-menu"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
          >
            {mobileOpen ? (
              <X size={20} className="text-bc-text-2" aria-hidden="true" />
            ) : (
              <Menu size={20} className="text-bc-text-2" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      </div>

      {/* Mobile Menu — starts below the bar so logo + CTA stay visible */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden fixed inset-x-0 bottom-0 top-16 sm:top-[4.5rem] z-40 bg-bc-surface border-t border-bc-line animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          <div className="flex h-full min-w-0 flex-col overflow-y-auto px-4 pb-8 pt-4 sm:px-6">
            <nav aria-label="Navigasi mobile" className="flex-1 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3.5 text-base font-medium rounded-xl transition-all focus-ring ${
                    isActivePath(pathname, link.href)
                      ? "text-bc-accent bg-bc-accent-soft"
                      : "text-bc-text-2 hover:text-bc-accent hover:bg-bc-accent-soft"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <p className="px-4 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-bc-text-3">
                Untuk Siapa
              </p>
              {audienceLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3.5 text-base font-medium rounded-xl text-bc-text-2 hover:text-bc-accent hover:bg-bc-accent-soft transition-all focus-ring"
                >
                  {link.label}
                </Link>
              ))}
              {showMarketplaceNav && (
                <>
                  <Link
                    href="/orders"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-4 py-3.5 text-base font-medium text-bc-text-2 hover:text-bc-accent hover:bg-bc-accent-soft rounded-xl transition-all focus-ring"
                  >
                    <span className="flex items-center gap-2"><Package size={18} /> Pesanan Saya</span>
                  </Link>
                  <Link
                    href="/cart"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-4 py-3.5 text-base font-medium text-bc-text-2 hover:text-bc-accent hover:bg-bc-accent-soft rounded-xl transition-all focus-ring"
                  >
                    <span className="flex items-center gap-2"><ShoppingCart size={18} /> Keranjang</span>
                    {cartCount > 0 && (
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
            </nav>
            <div className="space-y-3 pt-6 border-t border-bc-line">
              {user ? (
                <Link
                  href={getDashboardHref(user.role)}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-bc-text-2 bg-bc-surface-2 rounded-xl hover:bg-bc-accent-soft transition-colors focus-ring"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bc-accent to-bc-violet flex items-center justify-center text-white text-xs font-bold">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{user.fullName}</span>
                </Link>
              ) : (
                <Link
                  href={`/login?next=${encodeURIComponent(pathname)}`}
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-3 text-sm font-semibold text-bc-text-2 border border-bc-line rounded-xl hover:bg-bc-surface-2 transition-colors focus-ring"
                >
                  Masuk
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
