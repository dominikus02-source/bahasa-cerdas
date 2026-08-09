"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingCart, Package, User, LogOut } from "lucide-react";

const navLinks = [
  { href: "/#untuk-murid", label: "Untuk Murid" },
  { href: "/#untuk-guru", label: "Untuk Guru" },
  { href: "/#ekosistem", label: "Ekosistem" },
  { href: "/#bigt", label: "BIGT" },
  { href: "/tentang", label: "Tentang" },
  { href: "/faq", label: "FAQ" },
];

const marketplacePaths = ["/marketplace", "/cart", "/checkout", "/orders"];

function isMarketplacePage(pathname: string): boolean {
  return marketplacePaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function PageNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);

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
      setCartCount(cart.reduce((sum: number, i: any) => sum + (i.qty || 1), 0));
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    },
    []
  );

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
    return "/guru/beranda";
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-zinc-100 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="section-container">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative w-8 h-8 lg:w-9 lg:h-9">
              <Image
                src="/BC-logo.png"
                alt="Logo BahasaCerdas"
                fill
                sizes="36px"
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base lg:text-lg text-zinc-900 leading-tight">
                Bahasa<span className="text-primary">Cerdas</span>
              </span>
              <span className="text-[10px] lg:text-[11px] text-zinc-500 font-medium leading-tight -mt-0.5 hidden sm:block">
                Ekosistem Belajar Bahasa Indonesia
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav aria-label="Navigasi utama" className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 focus-ring ${
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "text-primary bg-primary-light/50"
                    : "text-zinc-600 hover:text-primary hover:bg-primary-light/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {showMarketplaceNav && (
              <>
                <Link
                  href="/orders"
                  className="relative ml-1 px-3 py-2 text-zinc-600 hover:text-primary transition-colors rounded-xl hover:bg-primary-light/50"
                  aria-label="Pesanan Saya"
                >
                  <Package size={20} />
                </Link>
                <Link
                  href="/cart"
                  className="relative ml-1 px-3 py-2 text-zinc-600 hover:text-primary transition-colors rounded-xl hover:bg-primary-light/50"
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
          <div className="hidden lg:flex items-center gap-3">
            {userLoading ? null : user ? (
              <Link
                href={getDashboardHref(user.role)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-700 bg-zinc-50 hover:bg-primary-light/50 rounded-xl transition-colors border border-zinc-200"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-[10px] font-bold">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate">{user.fullName}</span>
              </Link>
            ) : (
              <>
                <Link
                  href={`/login?next=${encodeURIComponent(pathname)}`}
                  className="px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:text-primary transition-colors focus-ring rounded-lg"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="relative px-6 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 focus-ring"
                >
                  Mulai Gratis
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            onKeyDown={handleKeyDown}
            className="lg:hidden relative z-50 p-2.5 rounded-xl hover:bg-zinc-100 transition-colors focus-ring"
            aria-controls="mobile-menu"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
          >
            {mobileOpen ? (
              <X size={20} className="text-zinc-700" aria-hidden="true" />
            ) : (
              <Menu size={20} className="text-zinc-700" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden fixed inset-0 top-0 z-40 bg-white animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
          onKeyDown={handleKeyDown}
        >
          <div className="flex flex-col h-full pt-24 px-6 pb-8">
            <nav aria-label="Navigasi mobile" className="flex-1 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3.5 text-base font-medium rounded-xl transition-all focus-ring ${
                    pathname === link.href || pathname.startsWith(link.href + "/")
                      ? "text-primary bg-primary-light/50"
                      : "text-zinc-700 hover:text-primary hover:bg-primary-light/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {showMarketplaceNav && (
                <>
                  <Link
                    href="/orders"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-4 py-3.5 text-base font-medium text-zinc-700 hover:text-primary hover:bg-primary-light/50 rounded-xl transition-all focus-ring"
                  >
                    <span className="flex items-center gap-2"><Package size={18} /> Pesanan Saya</span>
                  </Link>
                  <Link
                    href="/cart"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-4 py-3.5 text-base font-medium text-zinc-700 hover:text-primary hover:bg-primary-light/50 rounded-xl transition-all focus-ring"
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
            <div className="space-y-3 pt-6 border-t border-zinc-100">
              {user ? (
                <>
                  <Link
                    href={getDashboardHref(user.role)}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-700 bg-zinc-50 rounded-xl hover:bg-primary-light/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-xs font-bold">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{user.fullName}</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={`/login?next=${encodeURIComponent(pathname)}`}
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-4 py-3 text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors focus-ring"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-4 py-3 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25 focus-ring"
                  >
                    Mulai Gratis
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
