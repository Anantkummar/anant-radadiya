// Firebase's web configuration contains public identifiers, never admin credentials.
let connection;
async function connect() {
  if (!connection) connection = (async () => {
    const response = await fetch('./firebase-config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Shared storage is not configured yet. Please contact the site owner.');
    const config = await response.json();
    if (!config.apiKey) throw new Error('Shared storage is not configured yet. Please contact the site owner.');
    const base = 'https://www.gstatic.com/firebasejs/12.2.1';
    const [app, db, auth] = await Promise.all([
      import(`${base}/firebase-app.js`), import(`${base}/firebase-firestore.js`), import(`${base}/firebase-auth.js`)
    ]);
    const instance = app.initializeApp(config);
    const database = db.getFirestore(instance);
    const authentication = auth.getAuth(instance);
    await auth.setPersistence(authentication, auth.inMemoryPersistence);
    return { db, auth, database, authentication };
  })().catch(error => { connection = null; throw error; });
  return connection;
}

export function errorMessage(error) {
  if (error.code === 'auth/weak-password') return 'Choose a password with at least 6 characters.';
  if (error.code === 'auth/too-many-requests') return 'Too many attempts. Please wait a few minutes and try again.';
  if (error.code?.startsWith('auth/')) return 'Authentication failed. Check your username and password, then try again.';
  if (error.code === 'permission-denied') return 'Access denied. Please check the site’s shared storage permissions.';
  return error.message || 'Unable to connect. Please try again.';
}

export async function getAccountProfile() {
  const { db, database } = await connect();
  const profile = await db.getDocFromServer(db.doc(database, 'accountLogin', 'owner'));
  return profile.exists() ? profile.data() : null;
}

async function resolveEmail(identifier) {
  const value = identifier.trim().toLowerCase();
  if (value.includes('@')) return value;
  const profile = await getAccountProfile();
  if (!profile || profile.username !== value) {
    throw new Error('Check your username and try again.');
  }
  return profile.email;
}

export async function signIn(identifier, password) {
  const email = await resolveEmail(identifier);
  const { auth, db, database, authentication } = await connect();
  const { user } = await auth.signInWithEmailAndPassword(authentication, email, password);
  const admin = await db.getDocFromServer(db.doc(database, 'admins', user.uid));
  if (!admin.exists()) {
    await auth.signOut(authentication);
    throw new Error('This account does not have permission to manage projects.');
  }
}

async function reauthenticate(password) {
  const { auth, authentication } = await connect();
  const user = authentication.currentUser;
  if (!user) throw new Error('Please sign in again.');
  await auth.reauthenticateWithCredential(user, auth.EmailAuthProvider.credential(user.email, password));
  return { auth, user };
}

export async function changePassword(password, currentPassword) {
  if (password.length < 6) throw new Error('Use at least 6 characters for the new password.');
  const { auth, user } = await reauthenticate(currentPassword);
  await auth.updatePassword(user, password);
}

export async function changeUsername(username, currentPassword) {
  const value = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(value)) {
    throw new Error('Use 3 to 30 letters, numbers, or underscores for your username.');
  }
  const { user } = await reauthenticate(currentPassword);
  const { db, database } = await connect();
  await db.runTransaction(database, async transaction => {
    const ref = db.doc(database, 'accountLogin', 'owner');
    const profile = await transaction.get(ref);
    if (!profile.exists() || profile.data().uid !== user.uid) {
      throw new Error('This account cannot change the owner username.');
    }
    transaction.set(ref, { ...profile.data(), username: value });
  });
  return value;
}

export async function signOut() {
  const { auth, authentication } = await connect();
  await auth.signOut(authentication);
}

export async function resetPassword(identifier) {
  const email = await resolveEmail(identifier);
  const { auth, authentication } = await connect();
  try {
    await auth.sendPasswordResetEmail(authentication, email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }
}

export async function watchProjects(onChange, onError) {
  try {
    const { db, database } = await connect();
    return db.onSnapshot(db.doc(database, 'portfolio', 'projects'), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      onChange(snapshot.exists() ? snapshot.data() : { items: null, revision: 0 });
    }, onError);
  } catch (error) { onError(error); }
}

export async function saveProjects(items, revision) {
  const { db, database } = await connect();
  await db.runTransaction(database, async transaction => {
    const ref = db.doc(database, 'portfolio', 'projects');
    const current = await transaction.get(ref);
    const currentRevision = current.exists() ? current.data().revision : 0;
    if (currentRevision !== revision) throw new Error('Projects changed on another device. Close this editor and reopen the project before saving.');
    transaction.set(ref, { items, revision: revision + 1 });
  });
}

export async function watchReviews(onChange, onError) {
  try {
    const { db, database } = await connect();
    return db.onSnapshot(db.query(db.collection(database, 'reviews'), db.orderBy('createdAt')), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      onChange(snapshot.docs.map(doc => doc.data()));
    }, onError);
  } catch (error) { onError(error); }
}

export async function publishReview(review, id) {
  if (!navigator.onLine) throw new Error('You are offline. Reconnect before publishing your review.');
  const { db, database } = await connect();
  const ref = db.doc(database, 'reviews', id);
  // A stable ID lets a retry safely recover after a lost acknowledgement.
  if ((await db.getDocFromServer(ref)).exists()) return;
  await db.setDoc(ref, { ...review, createdAt: db.serverTimestamp() });
}
