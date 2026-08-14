import assert from "node:assert/strict";
import { test } from "node:test";

import {
  faqItems,
  primaryCtas,
  QUALIFICATION_TARGET,
  savingsClaim,
  savingsDisclaimer,
} from "./content";

test("all primary landing CTAs lead to the existing qualification flow", () => {
  assert.equal(primaryCtas.length, 4);

  for (const cta of primaryCtas) {
    assert.equal(cta.href, QUALIFICATION_TARGET);
  }
});

test("the savings claim is scoped to injected energy and displays its caveat", () => {
  assert.match(savingsClaim, /energia injetada/i);
  assert.doesNotMatch(savingsClaim, /valor total da conta/i);
  assert.match(savingsDisclaimer, /unidade consumidora/i);
  assert.match(savingsDisclaimer, /distribuidora/i);
  assert.match(savingsDisclaimer, /contrato/i);
  assert.match(savingsDisclaimer, /regras aplicáveis/i);
});

test("FAQ avoids guaranteed eligibility and immediate savings claims", () => {
  const answers = faqItems.map((item) => item.answer).join(" ");

  assert.match(answers, /não necessariamente/i);
  assert.match(answers, /elegibilidade depende/i);
  assert.doesNotMatch(answers, /aprovação garantida/i);
  assert.doesNotMatch(answers, /economia garantida/i);
});
