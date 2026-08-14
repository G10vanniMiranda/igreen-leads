"use client";

import { useEffect, useState } from "react";
import {
  CONSENT_CHANGED_EVENT,
  OPEN_CONSENT_EVENT,
  defaultConsentPreferences,
  readConsentPreferences,
  saveConsentPreferences,
  type ConsentPreferences,
} from "./consent";

type PanelMode = "closed" | "banner" | "settings";

export function ConsentPreferencesPanel() {
  const [mode, setMode] = useState<PanelMode>("closed");
  const [choices, setChoices] = useState({ analytics: false, advertising: false });

  useEffect(() => {
    const stored = readConsentPreferences(window.localStorage);
    queueMicrotask(() => {
      if (stored) {
        setChoices({ analytics: stored.analytics, advertising: stored.advertising });
      } else {
        setMode("banner");
      }
    });
    const open = () => {
      const current = readConsentPreferences(window.localStorage) ?? defaultConsentPreferences();
      setChoices({ analytics: current.analytics, advertising: current.advertising });
      setMode("settings");
    };
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open);
  }, []);

  function persist(next: Readonly<{ analytics: boolean; advertising: boolean }>) {
    const preferences = saveConsentPreferences(window.localStorage, next);
    setChoices(next);
    setMode("closed");
    window.dispatchEvent(new CustomEvent<ConsentPreferences>(CONSENT_CHANGED_EVENT, { detail: preferences }));
  }

  if (mode === "closed") return null;

  return (
    <section className="consent-panel" aria-label="Preferências de privacidade" role="dialog" aria-modal="false">
      <div className="consent-panel-copy">
        <p className="consent-kicker">Privacidade</p>
        <h2>{mode === "settings" ? "Escolha suas preferências" : "Você controla o tracking não essencial"}</h2>
        <p>
          Usamos armazenamento essencial para manter sua jornada. Analytics e publicidade permanecem desligados até sua escolha.
          Saiba mais na <a href="/privacidade">Política de Privacidade</a>.
        </p>
      </div>

      {mode === "settings" ? (
        <div className="consent-settings">
          <div className="consent-category">
            <span><strong>Essenciais</strong><small>Sempre ativos para funcionamento e segurança.</small></span>
            <span className="consent-required">Necessário</span>
          </div>
          <label className="consent-category">
            <span><strong>Analytics</strong><small>Medição de uso, sem nome ou telefone.</small></span>
            <input type="checkbox" checked={choices.analytics} onChange={(event) => setChoices((current) => ({ ...current, analytics: event.target.checked }))} />
          </label>
          <label className="consent-category">
            <span><strong>Publicidade</strong><small>Ferramentas como Meta Pixel, quando configuradas.</small></span>
            <input type="checkbox" checked={choices.advertising} onChange={(event) => setChoices((current) => ({ ...current, advertising: event.target.checked }))} />
          </label>
          <div className="consent-actions">
            <button type="button" onClick={() => persist({ analytics: false, advertising: false })}>Somente necessários</button>
            <button type="button" className="consent-primary" onClick={() => persist(choices)}>Salvar preferências</button>
          </div>
        </div>
      ) : (
        <div className="consent-actions">
          <button type="button" onClick={() => persist({ analytics: false, advertising: false })}>Somente necessários</button>
          <button type="button" onClick={() => setMode("settings")}>Configurar</button>
          <button type="button" className="consent-primary" onClick={() => persist({ analytics: true, advertising: true })}>Aceitar todos</button>
        </div>
      )}
    </section>
  );
}

export function OpenConsentPreferencesButton() {
  return (
    <button type="button" className="footer-preferences" onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>
      Preferências de cookies
    </button>
  );
}
