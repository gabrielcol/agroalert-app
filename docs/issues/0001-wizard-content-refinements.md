---
status: Todo
branch: feat/wizard-content-refinements
created: 2026-09-12
---

# Wizard content refinements: alert subscription, choice reasons, longer loading

## Description

Three content changes to the AgroAlert wizard prototype (public routes
`/plan/teren|cultura|soi|rezumat`):

1. **Alert subscription instead of an alert channel.** The summary screen asks "Cum vrei
   să primești alertele?" and then swaps to a full-screen confirmation. Alert Channel is
   not a property of a Sowing Plan; it is replaced by a single Alert Subscription CTA
   confirmed with a toast.
2. **Reasons on every choice card.** Crop and Variety cards only carry a one-line
   description. Each card gets three always-visible icon bullets (soil, sowing window,
   weather fit) plus an optional muted caution line, so the farmer sees _why_ an option is
   suggested.
3. **A loading screen that names the real inputs.** The four steps describe a 7-day
   forecast check. They become five steps that describe what the recommendation actually
   rests on.

## Acceptance criteria

- [ ] A single subscribe card sits in the old channel slot with the agreed copy.
- [ ] Tapping the CTA raises a toast with the agreed title and body.
- [ ] After subscribing, the button is disabled, reads "Abonat" with a check icon, and a
      back link to `/` appears.
- [ ] The channel radio group, the full-screen confirmation state and
      `src/components/agro/channel-options.tsx` are gone.
- [ ] No Alert Channel is left in code or copy: `CHANNELS`, `ChannelId`,
      `DEFAULT_CHANNEL`, `SAMPLE_PLANS[].channel`, `agro.rezumat.channel`,
      `agro.rezumat.activate`, `agro.done`.
- [ ] Every crop and variety card shows three ordered bullets (soil → window → weather),
      with a caution line only where the option is risky.
- [ ] Descriptions do not restate the bullets.
- [ ] RO/EN parity, including whether a `caution` exists per id.
- [ ] The loader plays five steps at `STEP_MS` 650 (~4 s total).
- [ ] `CONTEXT.md` drops the Alert Channel row and gains an Alert Subscription row.
- [ ] Vitest passes locally; the Playwright spec is updated (run pre-deploy, per the
      amended AGENTS.md rule 3).
