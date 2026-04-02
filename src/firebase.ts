import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, get, onValue, onDisconnect, remove, update, type DatabaseReference } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC_cb0E48GC5pm_fcQuODJ34T2GquWcKTg",
  authDomain: "kardaoke-game.firebaseapp.com",
  databaseURL: "https://kardaoke-game-default-rtdb.firebaseio.com",
  projectId: "kardaoke-game",
  storageBucket: "kardaoke-game.firebasestorage.app",
  messagingSenderId: "602150639737",
  appId: "1:602150639737:web:d9f7175c10f5e025695ca8",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

export async function ensureAuth(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser.uid);
      return;
    }

    const timeout = setTimeout(() => {
      unsub();
      reject(new Error('Authentication timed out. Check your Firebase config.'));
    }, 10000);

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timeout);
        unsub();
        resolve(user.uid);
      }
    });

    signInAnonymously(auth).catch((err) => {
      clearTimeout(timeout);
      unsub();
      reject(err);
    });
  });
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateRoomCode();
    const snapshot = await get(ref(db, `rooms/${code}`));
    if (!snapshot.exists()) return code;
  }
  return generateRoomCode() + Math.floor(Math.random() * 10);
}

export function roomRef(code: string, ...path: string[]): DatabaseReference {
  const fullPath = ['rooms', code, ...path].join('/');
  return ref(db, fullPath);
}

export { ref, set, get, onValue, onDisconnect, remove, update, push };
export type { DatabaseReference };
