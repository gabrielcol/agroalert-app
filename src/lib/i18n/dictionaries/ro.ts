// Romanian dictionary — must mirror the shape of `en.ts` (enforced by the type).

import type { Dictionary } from "./en";

export const ro: Dictionary = {
  app: {
    name: "AgroAlert",
    tagline: "Planuri de semănat și alerte meteo pentru culturile tale",
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
  agro: {
    dashboard: {
      title: "Culturile tale",
      subtitle: "Alertele active și planurile de semănat, într-un singur loc.",
      add: "Adaugă o cultură nouă",
      emptyTitle: "Nicio cultură adăugată încă",
      emptyBody: "Adaugă prima ta cultură ca să primești recomandări și alerte",
      active: "Activ",
      alertsActive: "Alerte active",
      sample: { crop: "Porumb", variety: "P0216" },
    },
    wizard: {
      stepOf: "Pasul {n} din {total}",
      continue: "Continuă",
      back: "Înapoi",
    },
    teren: {
      title: "Spune-ne despre teren",
      subtitle: "Trei întrebări simple, apoi îți arătăm ce se potrivește.",
      village: {
        label: "Sat / comună",
        placeholder: "ex: Reviga, Ialomița",
        detect: "Detectează automat locația",
      },
      land: {
        label: "Câte hectare ai?",
        small: "< 5 ha",
        medium: "5–10 ha",
        large: "10+ ha",
      },
      irrigation: {
        label: "Ai posibilitate de irigare?",
        yes: "Da, am",
        no: "Nu am",
      },
    },
    loading: {
      title: "Pregătim recomandarea",
      subtitle: "Câteva secunde",
      steps: {
        history: "Preluăm datele meteorologice din ultimii ani",
        forecast: "Preluăm datele meteo pentru următoarea perioadă",
        crops: "Inspectăm culturile potrivite pentru tine",
        windows: "Comparăm cu perioadele de semănat",
        list: "Creăm lista pentru tine",
      },
    },
    cultura: {
      header: "Recomandare culturi",
      title: "Ce se potrivește terenului tău",
      subtitle:
        "Pe baza vremii din zona ta și a răspunsurilor tale. Alege o cultură.",
      recommended: "Recomandat",
      crops: {
        grau: {
          name: "Grâu de toamnă",
          description: "Cel mai mic risc pentru terenul tău anul acesta.",
          reasons: {
            soil: "Sol potrivit — reține bine apa pentru răsărire",
            window: "Fereastră largă: 25 sept – 15 oct",
            weather: "Ploile din ultimii ani și prognoza îi priesc",
          },
        },
        orz: {
          name: "Orz",
          description: "Se recoltează cu 2–3 săptămâni înaintea grâului.",
          reasons: {
            soil: "Se descurcă și pe soluri mai sărace",
            window: "Fereastră mai scurtă: 20 sept – 5 oct",
            weather: "Rezistă mai bine la secetă decât grâul",
            caution: "Iernile aspre îl pot afecta mai mult decât grâul",
          },
        },
        rapita: {
          name: "Rapiță",
          description: "Preț bun, dar cere lucrări mai atente.",
          reasons: {
            soil: "Cere un pat germinativ bine pregătit",
            window: "Fereastră scurtă: 1 – 15 sept",
            weather: "Fără irigare, prognoza dă prea puțină ploaie",
            caution:
              "Semănatul târziu sau toamna secetoasă îi strică răsărirea",
          },
        },
      },
    },
    soi: {
      header: "Alege soiul",
      title: "Soiuri de grâu potrivite",
      subtitle: "Cele mai potrivite soiuri pentru vremea și solul din zona ta.",
      cta: "Vezi planul",
      varieties: {
        glosa: {
          name: "Glosa",
          description: "Soiul cel mai semănat în zonă, cu producție constantă.",
          tag: "Rezistență secetă: mare",
          reasons: {
            soil: "Merge pe sol greu, chiar și fără irigare",
            window: "Semănat ideal la mijlocul ferestrei: 1 – 10 oct",
            weather: "A dat recolte bune în anii secetoși de până acum",
          },
        },
        pitar: {
          name: "Pitar",
          description: "Boabe de calitate bună pentru panificație.",
          tag: "Rezistență secetă: medie",
          reasons: {
            soil: "Cere sol mai bine aprovizionat cu apă",
            window: "Semănat devreme în fereastră: 25 sept – 5 oct",
            weather: "În anii cu toamnă ploioasă a dat producții mari",
            caution: "Rezistență medie la secetă — riscant fără irigare",
          },
        },
        ursita: {
          name: "Ursita",
          description:
            "Eliberează terenul mai devreme, bun înainte de o a doua cultură.",
          tag: "Maturitate: timpurie",
          reasons: {
            soil: "Nu are pretenții mari la sol",
            window: "Se seamănă la sfârșitul ferestrei: 5 – 15 oct",
            weather: "Se coace devreme și scapă de arșița din iunie",
            caution: "Semănată prea devreme, riscă înghețul de primăvară",
          },
        },
      },
    },
    rezumat: {
      header: "Planul tău",
      title: "Grâu de toamnă · Glosa",
      subtitle: "Planul complet, pe baza prognozei pentru zona ta.",
      when: {
        title: "Când să semeni",
        window: "25 sept – 15 oct",
        note: "Fereastra optimă pentru zona ta, pe baza prognozei",
      },
      calendar: {
        title: "Calendarul culturii",
        rows: {
          sowing: {
            when: "Sept–Oct",
            title: "Semănat",
            sub: "În fereastra de mai sus",
          },
          emergence: {
            when: "Noiembrie",
            title: "Răsărire și fertilizare de bază",
            sub: "Verifici răsărirea uniformă",
          },
          spring: {
            when: "Martie",
            title: "Fertilizare de primăvară",
            sub: "La reluarea vegetației",
          },
          treatments: {
            when: "Mai–Iun",
            title: "Tratamente și monitorizare boli",
            sub: "Pe baza umidității din sol",
          },
          harvest: {
            when: "Iulie",
            title: "Recoltare",
            sub: "Estimativ, în funcție de an",
          },
        },
      },
      alerts: {
        title: "Alerte pentru zona ta",
        drought: {
          title: "Te anunțăm dacă vine o secetă în fereastra de semănat",
          sub: "Pe baza prognozei pe 7 zile",
        },
        rain: {
          title: "Te anunțăm când vine ploaia potrivită pentru semănat",
          sub: "Peste 10 mm în 48 de ore",
        },
        anm: {
          title: "Momentan: niciun cod de avertizare ANM în zonă",
          sub: "Verificat azi",
        },
      },
      subscribe: {
        title: "Primește alerte pentru acest plan",
        body: "Te anunțăm despre secetă, ploi potrivite și avertizări ANM în perioada de semănat.",
        cta: "Abonează-mă la alerte",
        done: "Abonat",
        back: "Înapoi la culturile tale",
        toast: {
          title: "Te-ai abonat la alerte",
          body: "Te anunțăm când apar schimbări pentru zona ta.",
        },
      },
    },
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
