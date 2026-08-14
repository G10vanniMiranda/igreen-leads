import { BrandMark } from "@/components/brand-mark";
import {
  navigationItems,
  QUALIFICATION_TARGET,
} from "@/features/landing/content";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container-shell site-header-inner">
        <a href="#inicio" aria-label="Conexão Green — início">
          <BrandMark />
        </a>

        <nav className="header-navigation" aria-label="Navegação principal">
          {navigationItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <a className="header-cta" href={QUALIFICATION_TARGET}>
          Verificar minha conta
        </a>
      </div>
    </header>
  );
}
