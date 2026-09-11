# Anant Radadiya portfolio

Projects and reviews use Firebase Firestore live listeners shared by all devices.
Browser local storage is used only to recover data from the older site.
The web configuration in firebase-config.json is public. Never add credentials.

## Admin panel

Open `/admin` and sign in with the owner username to add,
edit, or delete projects. The public website contains no editing controls.
Changes are published to Firestore and stream to connected visitors.
Sign out when finished; authentication clears on reload.
Only accounts in the server-managed `admins` collection can write projects.
Account settings allows username and password changes after confirming the
current password. The public `accountLogin/owner` document holds only the login
alias, owner UID, and recovery email; passwords remain in Firebase Authentication.

## Firebase setup

The default database was created and firestore.rules was deployed on 2026-09-08.
Email/password Authentication and the requested admin account were configured
on 2026-09-08. The owner must choose a password using the private setup link.
The website and separate admin panel were deployed to Firebase Hosting on
2026-09-10 at https://anant-radadiya.web.app.

1. In Firebase project anant-radadiya, enable Cloud Firestore and create the
   (default) database in production mode. Select the region before creating it.
2. In Authentication, enable Email/Password and create the site owner's account.
   The previous browser-only password no longer grants access.
3. Copy the account UID and create the Firestore document admins/UID in the
   Firebase console, with enabled: true. Only grant this to the site owner.
   Remove that document to revoke access.
4. Deploy rules: firebase deploy --only firestore:rules --project anant-radadiya
5. Publish the static files to the existing host, including shared-data.js and
   firebase-config.json. For Firebase Hosting:
   firebase deploy --only hosting --project anant-radadiya

Project edits require the admin username and password. Reviews are public; database
rules validate fields and ratings and prevent visitors from changing existing
reviews or projects. Only confirmed server snapshots appear as shared data.

The initial three projects appear only when portfolio/projects has never been
saved. Saving an empty list does not restore defaults. Revision checks prevent
an old editor from overwriting newer changes made on another device.

## Existing phone data

Projects load from shared storage automatically. The project section does not
offer an import button for older device-local project lists.
Open the updated site on the original phone and browser.
Use 'Publish reviews saved on this device' to publish older reviews. Stable IDs
prevent duplicate reviews when retrying an import. Local data is removed only
after confirmed success. Cleared data and data on other devices cannot be
recovered from this workspace.

## Verification

Run: node --experimental-vm-modules --test tests/shared-data.test.cjs

These tests simulate separate clients using shared storage and cover deletion,
empty-list reloads, stale edits, review synchronization, duplicate retries,
offline errors, admin access checks, and unconfirmed snapshots. They do not
replace testing deployed Firebase rules and two real browsers.

After setup, open two browsers. Add, edit, and delete a project and verify the
other updates without refreshing. Publish a review and verify both walls and
averages update. Reload both to confirm deletions persist. Verify non-admins
cannot edit projects and failed reviews retain their form contents.

Firebase listener documentation:
https://firebase.google.com/docs/firestore/query-data/listen

Public URLs: `/` (portfolio), `/admin` (admin), and `/project-demo` (demo). Legacy `.html` links redirect automatically.
