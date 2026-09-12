// English dictionary — the source of truth for translation keys.
// Every other dictionary must mirror its shape (enforced by the `Dictionary` type).

export const en = {
  app: {
    name: "AgroPlan",
    tagline: "Sowing plans and weather alerts for your crops",
  },
  common: {
    next: "Next",
    back: "Back",
    cancel: "Cancel",
    save: "Save",
    confirm: "Confirm",
    close: "Close",
    edit: "Edit",
    delete: "Delete",
    add: "Add",
    search: "Search",
    language: "Language",
    theme: "Theme",
    signOut: "Sign out",
    signIn: "Sign in",
    yes: "Yes",
    no: "No",
    optional: "optional",
    required: "required",
    all: "All",
    status: "Status",
    actions: "Actions",
    date: "Date",
    or: "or",
  },
  nav: {
    dashboard: "Dashboard",
    users: "Users",
    audit: "Audit log",
    settings: "Settings",
    section: {
      overview: "Overview",
      administration: "Administration",
    },
  },
  agro: {
    dashboard: {
      title: "Your crops",
      subtitle: "Active alerts and sowing plans, all in one place.",
      add: "Add a new crop",
      emptyTitle: "No crops added yet",
      emptyBody: "Add your first crop to get recommendations and alerts",
      active: "Active",
      sownOn: "Sown {date}",
      nextStage: "Next: {stage} in {n} days",
      nextToday: "Next: {stage} today",
      finished: "Harvest done",
    },
    wizard: {
      stepOf: "Step {n} of {total}",
      continue: "Continue",
      back: "Back",
    },
    teren: {
      title: "Tell us about your land",
      subtitle: "Three simple questions, then we show you what fits.",
      village: {
        label: "Village / commune",
        placeholder: "e.g. Reviga, Ialomița",
        detect: "Detect location automatically",
        located: "Current location",
        notFound: "We couldn't find that place. Check the name and try again.",
        denied:
          "We couldn't read your phone's location. Type the village or commune.",
      },
      land: {
        label: "How many hectares do you have?",
        small: "< 5 ha",
        medium: "5–10 ha",
        large: "10+ ha",
      },
      irrigation: { label: "Can you irrigate?", yes: "Yes, I can", no: "No" },
      // Soil Class (issue 0004 wires the selector)
      soil: {
        label: "What kind of soil do you have?",
        cernoziom: "Chernozem (black earth)",
        lutos: "Loam",
        argilos: "Clay",
        nisipos: "Sandy",
        unknown: "I don't know",
      },
    },
    loading: {
      title: "Preparing your recommendation",
      subtitle: "A few seconds",
      error: "We couldn't prepare your recommendation.",
      retry: "Try again",
      steps: {
        location: "Finding your land",
        history: "Pulling weather data from past years",
        forecast: "Pulling the forecast for the period ahead",
        crops: "Checking which crops suit you",
        windows: "Comparing with the sowing windows",
        list: "Building your list",
      },
    },
    cultura: {
      header: "Crop recommendation",
      title: "What fits your land",
      subtitle:
        "Based on the weather in your area and your answers. Pick a crop.",
      recommended: "Recommended",
      // Crop Recommendation cards (issue 0006 renders them)
      recommendation: {
        fit: "Fit {n}%",
        reasons: "Why",
        risks: "Watch out for",
        window: "Sowing window: {from} – {to}",
        others: "Other crops",
        excluded: "Set aside this time",
        confidence: {
          low: "Low confidence",
          medium: "Fair confidence",
          high: "High confidence",
        },
        retry: "We couldn't read the weather. Try again.",
        retryAi: "We couldn't prepare the recommendation. Try again.",
        retryTitle: "Something went wrong",
        retryAction: "Try again",
      },
    },
    soi: {
      header: "Choose the variety",
      title: "Suitable varieties",
      titleFor: "Suitable {crop} varieties",
      subtitle:
        "The varieties best suited to the weather and soil in your area.",
      cta: "See the plan",
      // Variety Recommendation ranking (issue 0006 renders it)
      ranking: {
        rank: "#{n}",
        fit: "Fit {n}%",
        reasons: "Why",
        empty: "No registered variety is listed for this crop.",
      },
    },
    rezumat: {
      header: "Your plan",
      title: "Winter wheat · Glosa",
      subtitle: "The complete plan, based on the forecast for your area.",
      when: {
        title: "When to sow",
        window: "25 Sep – 15 Oct",
        note: "The optimal window for your area, based on the forecast",
      },
      calendar: {
        title: "Crop calendar",
        dayZero: "Day 0",
        dayOffset: "+{n} days",
        hint: "Tap “Mark as sown” below and the dates fill in",
        sownOn: "Sown on {date}",
        rows: {
          sowing: {
            title: "Sowing",
            sub: "Within the window above",
          },
          emergence: {
            title: "Emergence and base fertilisation",
            sub: "Check for even emergence",
          },
          spring: {
            title: "Spring fertilisation",
            sub: "When growth resumes",
          },
          treatments: {
            title: "Treatments and disease monitoring",
            sub: "Based on soil moisture",
          },
          harvest: {
            title: "Harvest",
            sub: "Estimated, depends on the year",
          },
        },
      },
      alerts: {
        title: "Alerts are on",
        intro:
          "For this plan we warn you about drought, suitable rain and ANM codes.",
        drought: {
          title: "We warn you if a drought hits during the sowing window",
          sub: "Based on the 7-day forecast",
        },
        rain: {
          title: "We tell you when the right rain for sowing arrives",
          sub: "Over 10 mm in 48 hours",
        },
        anm: {
          title: "Right now: no ANM warning code in your area",
          sub: "Checked today",
        },
      },
      sown: {
        cta: "Mark as sown",
        question: "Sown today?",
        toastTitle: "Sown on {date}",
        toastBody: "Alerts are active for this crop.",
        error: "Could not save. Try again.",
        back: "Back to your crops",
      },
    },
  },
  admin: {
    topbar: {
      account: "Account",
      profile: "Profile",
    },
    dashboard: {
      welcome: "Welcome, {name}",
      subtitle:
        "This demo slice exercises auth, a protected tRPC procedure, Prisma and the UI kit.",
    },
  },
  auth: {
    heading: "Administration portal",
    subtitle: "Manage users, review activity and configure the application.",
    points: [
      "Role-based access control",
      "Append-only audit log",
      "Typed API and validated configuration",
    ],
    form: {
      signInTitle: "Welcome back",
      signUpTitle: "Create an account",
      signInDesc: "Sign in to your account to continue.",
      signUpDesc: "Enter your details to get started.",
      name: "Name",
      email: "Email",
      password: "Password",
      emailPlaceholder: "you@example.com",
      pending: "Please wait…",
      signIn: "Sign in",
      signUp: "Sign up",
      haveAccount: "Already have an account? ",
      noAccount: "No account yet? ",
      linkSignIn: "Sign in",
      linkSignUp: "Sign up",
      error: "Something went wrong",
      signUpDisabledTitle: "Sign-up unavailable",
      signUpDisabled:
        "Self-service sign-up is disabled. Ask your administrator to create an account for you.",
    },
  },
  config: {
    crud: {
      saveSuccess: "Changes saved.",
      saveError: "Could not save. Please try again.",
      saving: "Saving…",
      readOnly: "You do not have permission to edit this section.",
    },
    settings: {
      subtitle: "General application settings.",
      save: "Save settings",
      tabs: {
        general: "General",
        languages: "Languages",
      },
      org: {
        title: "Organisation",
        site: "Site name",
      },
      languages: {
        title: "Languages",
        description: "Pick the language shown to users by default.",
        default: "Default language",
      },
    },
  },
};

export type Dictionary = typeof en;
