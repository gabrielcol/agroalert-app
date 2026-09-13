// Romanian dictionary — must mirror the shape of `en.ts` (enforced by the type).

import type { Dictionary } from "./en";

export const ro: Dictionary = {
  app: {
    name: "AgroPlan",
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
      sownOn: "Semănat {date}",
      nextStage: "Urmează: {stage} în {n} zile",
      nextToday: "Urmează: {stage} azi",
      finished: "Recoltat",
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
        located: "Locația curentă",
        notFound:
          "Nu am găsit localitatea. Verifică numele și încearcă din nou.",
        denied: "Nu am putut citi locația telefonului. Scrie satul sau comuna.",
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
      // Soil Class (issue 0004 wires the selector)
      soil: {
        label: "Ce tip de sol ai?",
        cernoziom: "Cernoziom",
        lutos: "Lutos",
        argilos: "Argilos",
        nisipos: "Nisipos",
        unknown: "Nu știu",
      },
    },
    splash: {
      loading: "Se încarcă planurile tale…",
    },
    loading: {
      title: "Pregătim recomandarea",
      subtitle: "Câteva secunde",
      error: "Nu am putut pregăti recomandarea.",
      retry: "Încearcă din nou",
      steps: {
        location: "Găsim terenul",
        history: "Preluăm datele meteorologice din ultimii ani",
        forecast: "Preluăm datele meteo pentru următoarea perioadă",
        recommendation: "Alegem culturile potrivite pentru tine",
      },
    },
    cultura: {
      header: "Recomandare culturi",
      title: "Ce se potrivește terenului tău",
      subtitle:
        "Pe baza vremii din zona ta și a răspunsurilor tale. Alege o cultură.",
      recommended: "Recomandat",
      // Crop Recommendation cards (issue 0006 renders them)
      recommendation: {
        fit: "Potrivire {n}%",
        reasons: "De ce",
        risks: "Ai grijă la",
        window: "Fereastra de semănat: {from} – {to}",
        others: "Alte culturi",
        excluded: "Lăsate deoparte de data asta",
        confidence: {
          low: "Încredere scăzută",
          medium: "Încredere medie",
          high: "Încredere ridicată",
        },
        retry: "Nu am putut citi vremea. Încearcă din nou.",
        retryAi: "Nu am putut pregăti recomandarea. Încearcă din nou.",
        retryTitle: "Ceva nu a mers",
        retryAction: "Încearcă din nou",
      },
    },
    soi: {
      header: "Alege soiul",
      title: "Soiuri potrivite",
      titleFor: "Soiuri de {crop} potrivite",
      subtitle: "Cele mai potrivite soiuri pentru vremea și solul din zona ta.",
      cta: "Vezi planul",
      // Variety Recommendation ranking (issue 0006 renders it)
      ranking: {
        rank: "#{n}",
        fit: "Potrivire {n}%",
        reasons: "De ce",
        // Shown while the variety model call is in flight (issue 0022).
        loading: "Se încarcă soiurile…",
        empty: "Nu există soi înregistrat pentru această cultură.",
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
        dayZero: "Ziua 0",
        dayOffset: "+{n} zile",
        hint: "Apasă „Marchează semănat” mai jos și datele se completează",
        sownOn: "Semănat pe {date}",
        rows: {
          sowing: {
            title: "Semănat",
            sub: "În fereastra de mai sus",
          },
          emergence: {
            title: "Răsărire și fertilizare de bază",
            sub: "Verifici răsărirea uniformă",
          },
          spring: {
            title: "Fertilizare de primăvară",
            sub: "La reluarea vegetației",
          },
          treatments: {
            title: "Tratamente și monitorizare boli",
            sub: "Pe baza umidității din sol",
          },
          harvest: {
            title: "Recoltare",
            sub: "Estimativ, în funcție de an",
          },
        },
      },
      alerts: {
        title: "Alertele sunt active",
        intro:
          "Pentru acest plan te anunțăm despre secetă, ploi potrivite și coduri ANM.",
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
      sown: {
        cta: "Marchează semănat",
        question: "Ai semănat azi?",
        toastTitle: "Semănat pe {date}",
        toastBody: "Alertele sunt active pentru această cultură.",
        error: "Nu am putut salva. Încearcă din nou.",
        back: "Înapoi la culturile tale",
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
