// Romanian dictionary — must mirror the shape of `en.ts` (enforced by the type).

import type { Dictionary } from "./en";

export const ro: Dictionary = {
  app: {
    name: "App",
    tagline: "O fundație pentru aplicații full-stack",
  },
  common: {
    next: "Continuă",
    back: "Înapoi",
    cancel: "Anulează",
    save: "Salvează",
    confirm: "Confirmă",
    close: "Închide",
    edit: "Editează",
    delete: "Șterge",
    add: "Adaugă",
    search: "Caută",
    language: "Limbă",
    theme: "Temă",
    signOut: "Deconectare",
    signIn: "Autentificare",
    yes: "Da",
    no: "Nu",
    optional: "opțional",
    required: "obligatoriu",
    all: "Toate",
    status: "Status",
    actions: "Acțiuni",
    date: "Dată",
    or: "sau",
  },
  nav: {
    dashboard: "Panou principal",
    users: "Utilizatori",
    audit: "Jurnal audit",
    settings: "Setări",
    section: {
      overview: "Prezentare",
      administration: "Administrare",
    },
  },
  landing: {
    title: "Aplicația ta începe aici",
    subtitle:
      "Autentificare, roluri, jurnal de audit și un API tipizat — conectate cap-coadă, gata de extins.",
    cta: "Deschide panoul",
    note: "Autentifică-te cu un cont creat de administrator pentru a continua.",
  },
  admin: {
    topbar: {
      account: "Cont",
      profile: "Profil",
    },
    dashboard: {
      welcome: "Bun venit, {name}",
      subtitle:
        "Acest exemplu exersează autentificarea, o procedură tRPC protejată, Prisma și kit-ul de UI.",
    },
  },
  auth: {
    heading: "Portal administrare",
    subtitle:
      "Gestionează utilizatorii, verifică activitatea și configurează aplicația.",
    points: [
      "Control al accesului pe bază de roluri",
      "Jurnal de audit doar cu adăugare",
      "API tipizat și configurație validată",
    ],
    form: {
      signInTitle: "Bine ai revenit",
      signUpTitle: "Creează un cont",
      signInDesc: "Autentifică-te în cont pentru a continua.",
      signUpDesc: "Completează datele pentru a începe.",
      name: "Nume",
      email: "E-mail",
      password: "Parolă",
      emailPlaceholder: "nume@exemplu.ro",
      pending: "Se procesează…",
      signIn: "Autentificare",
      signUp: "Înregistrare",
      haveAccount: "Ai deja un cont? ",
      noAccount: "Nu ai încă un cont? ",
      linkSignIn: "Autentifică-te",
      linkSignUp: "Înregistrează-te",
      error: "Ceva nu a funcționat",
      signUpDisabledTitle: "Înregistrare indisponibilă",
      signUpDisabled:
        "Înregistrarea directă este dezactivată. Solicită administratorului să îți creeze un cont.",
    },
  },
  config: {
    crud: {
      saveSuccess: "Modificările au fost salvate.",
      saveError: "Salvarea a eșuat. Încearcă din nou.",
      saving: "Se salvează…",
      readOnly: "Nu ai permisiunea de a edita această secțiune.",
    },
    settings: {
      subtitle: "Setări generale ale aplicației.",
      save: "Salvează setările",
      tabs: {
        general: "General",
        languages: "Limbi",
      },
      org: {
        title: "Organizație",
        site: "Denumire site",
      },
      languages: {
        title: "Limbi",
        description: "Alege limba afișată implicit utilizatorilor.",
        default: "Limbă implicită",
      },
    },
  },
};
