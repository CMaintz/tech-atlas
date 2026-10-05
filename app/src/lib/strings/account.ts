/**
 * Accounts, sign-in and progress sync.
 * A slice of `UI` (site.ts), which merges every area into one table per language.
 */
export const UI_ACCOUNT = {
  en: {
    account: 'Account',
    signIn: 'Sign in',
    signInTitle: 'Sign in to Atlas',
    signInWhy:
      'Signing in keeps your study progress in step across your devices. Everything else works without an account.',
    signOut: 'Sign out',
    accountIntro:
      'Sign in to keep your progress in step across devices. Everything works without an account too.',
    accountsOff: 'Accounts are not enabled on this site. Your progress is stored in this browser.',
    emailLabel: 'Email',
    sendLink: 'Email me a sign-in link',
    linkSent: 'Check your inbox and open the link in this browser to finish signing in.',
    or: 'or',
    withGitHub: 'Sign in with GitHub',
    withLinkedIn: 'Sign in with LinkedIn',
    privacyLink: 'How Atlas handles your data',
    downloadProgress: 'Download my progress',
    downloadNote:
      'Your progress as a JSON file - the same data that is synced when you are signed in.',
    authError: 'Something went wrong: {msg}',
    signedInAs: 'Signed in as {email}',
    syncRetry: 'Try again',
    syncAuto: 'Your progress syncs automatically whenever it changes.',
    syncShort_syncing: 'Syncing…',
    syncShort_synced: 'Synced',
    syncShort_offline: 'Offline',
    syncShort_error: 'Not synced',
    sync_syncing: 'Syncing…',
    sync_synced: 'Progress synced.',
    sync_offline: 'Offline - changes are kept here and sync when you are back online.',
    sync_error: 'Could not sync just now - your progress is safe in this browser.',
    lastSynced: 'Progress synced at {time}.',
    deleteData: 'Delete my synced data',
    deleteNote:
      'Deletes your synced progress from the server and signs you out; other devices are signed out at their next sync. Progress in this browser is kept.',
    deleteConfirm: 'Delete your synced progress from the server and sign out?',
    deleted: 'Your synced data has been deleted.',
    syncNote: 'Your progress is stored in this browser - sign in to sync it across devices.',
    stoppedNote:
      'Your synced data was deleted, so syncing is paused. Start again to upload the progress in this browser.',
    startAgain: 'Start syncing again',
    remoteDeleted:
      'You were signed out because your synced data was deleted on another device. Progress in this browser is kept.',
    dismiss: 'Dismiss',
    signOutFailed: 'Your data was deleted, but signing out other devices failed: {msg}',
  },
  da: {
    account: 'Konto',
    signIn: 'Log ind',
    signInTitle: 'Log ind på Atlas',
    signInWhy:
      'Når du logger ind, følger dine fremskridt med dig mellem dine enheder. Alt andet virker uden en konto.',
    signOut: 'Log ud',
    accountIntro:
      'Log ind for at holde dine fremskridt ens på tværs af enheder. Alt virker også uden en konto.',
    accountsOff: 'Konti er ikke slået til på dette site. Dine fremskridt gemmes i denne browser.',
    emailLabel: 'E-mail',
    sendLink: 'Send mig et login-link',
    linkSent: 'Tjek din indbakke, og åbn linket i denne browser for at logge ind.',
    or: 'eller',
    withGitHub: 'Log ind med GitHub',
    withLinkedIn: 'Log ind med LinkedIn',
    privacyLink: 'Sådan behandler Atlas dine data',
    downloadProgress: 'Download mine fremskridt',
    downloadNote:
      'Dine fremskridt som en JSON-fil - de samme data, der synkroniseres, når du er logget ind.',
    authError: 'Noget gik galt: {msg}',
    signedInAs: 'Logget ind som {email}',
    syncRetry: 'Prøv igen',
    syncAuto: 'Dine fremskridt synkroniseres automatisk, hver gang de ændres.',
    syncShort_syncing: 'Synkroniserer …',
    syncShort_synced: 'Synkroniseret',
    syncShort_offline: 'Offline',
    syncShort_error: 'Ikke synkroniseret',
    sync_syncing: 'Synkroniserer …',
    sync_synced: 'Fremskridt synkroniseret.',
    sync_offline: 'Offline - ændringer gemmes her og synkroniseres, når du er online igen.',
    sync_error: 'Kunne ikke synkronisere lige nu - dine fremskridt er sikre i denne browser.',
    lastSynced: 'Fremskridt synkroniseret kl. {time}.',
    deleteData: 'Slet mine synkroniserede data',
    deleteNote:
      'Sletter dine synkroniserede fremskridt fra serveren og logger dig ud; andre enheder logges ud ved deres næste synkronisering. Fremskridt i denne browser bevares.',
    deleteConfirm: 'Slet dine synkroniserede fremskridt fra serveren og log ud?',
    deleted: 'Dine synkroniserede data er slettet.',
    syncNote:
      'Dine fremskridt gemmes i denne browser - log ind for at synkronisere dem på tværs af enheder.',
    stoppedNote:
      'Dine synkroniserede data er slettet, så synkroniseringen er sat på pause. Start igen for at uploade fremskridtene i denne browser.',
    startAgain: 'Start synkronisering igen',
    remoteDeleted:
      'Du blev logget ud, fordi dine synkroniserede data blev slettet på en anden enhed. Fremskridt i denne browser bevares.',
    dismiss: 'Luk',
    signOutFailed: 'Dine data er slettet, men det lykkedes ikke at logge andre enheder ud: {msg}',
  },
} as const;
