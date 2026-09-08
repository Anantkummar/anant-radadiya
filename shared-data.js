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
  if (error.code?.startsWith('auth/')) return 'Sign-in failed. Check your admin email and password, then try again.';
  if (error.code === 'permission-denied') return 'Access denied. Please check the site’s shared storage permissions.';
  return error.message || 'Unable to connect. Please try again.';
}

export async function signIn(email, password) {
  const { auth, db, database, authentication } = await connect();
  const { user } = await auth.signInWithEmailAndPassword(authentication, email, password);
  const admin = await db.getDocFromServer(db.doc(database, 'admins', user.uid));
  if (!admin.exists()) {
    await auth.signOut(authentication);
    throw new Error('This account does not have permission to manage projects.');
  }
}

export async function changePassword(password) {
  const { auth, authentication } = await connect();
  await auth.updatePassword(authentication.currentUser, password);
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
