// English dictionary — the source of truth for translation keys.
// Every other dictionary must mirror its shape (enforced by the `Dictionary` type).

export const en = {
  app: {
    name: "App",
    tagline: "A full-stack application foundation",
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
  landing: {
    title: "Your app starts here",
    subtitle:
      "Authentication, roles, an audit trail and a typed API — wired end to end, ready to build on.",
    cta: "Open the dashboard",
    note: "Sign in with an admin-provisioned account to continue.",
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
